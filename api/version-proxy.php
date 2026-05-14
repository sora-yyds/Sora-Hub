<?php
/**
 * SORA-HUB 版本检测代理（带数据库缓存 + 频率限制）
 *
 * GET /api/version-proxy.php?tool=scripthookv
 * GET /api/version-proxy.php?tool=scripthookvdotnet
 * 返回 JSON: { ok, source, cached, stale, ... }
 *
 * 缓存策略：默认 1 小时内使用数据库缓存，超过后重新抓取
 * 频率限制：同一工具 5 分钟内禁止重复抓取（防止被目标站封 IP）
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ==================== 配置 ====================
define('CACHE_TTL',        7200);   // 缓存有效期：2 小时（秒），内视为"最新"
define('FETCH_COOLDOWN',   9000);   // 抓取冷却：2.5 小时（秒），内不重复请求外部网站

// ==================== 路由 ====================
$tool = strtolower($_GET['tool'] ?? '');

if (!in_array($tool, ['scripthookv', 'scripthookvdotnet'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => '请提供有效的 tool 参数: scripthookv 或 scripthookvdotnet']);
    exit;
}

// ==================== 数据库初始化 ====================
$pdo = null;
try {
    $config = require __DIR__ . '/config.php';
    $pdo = new PDO(
        "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4",
        $config['user'], $config['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$config['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `{$config['name']}`");
} catch (PDOException $e) {
    // 数据库连接失败，降级为无缓存模式
    error_log('[version-proxy] 数据库连接失败: ' . $e->getMessage());
    $pdo = null;
}

// 连接成功后，单独处理建表（避免建表失败导致 $pdo 被丢弃）
if ($pdo) {
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS `version_cache` (
            `tool`        VARCHAR(50)  NOT NULL PRIMARY KEY,
            `data`        TEXT         NOT NULL,
            `fetched_at`  INT UNSIGNED NOT NULL,
            `source`      VARCHAR(20)  NOT NULL DEFAULT 'online',
            INDEX idx_fetched (`fetched_at`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    } catch (PDOException $e) {
        error_log('[version-proxy] version_cache 建表失败: ' . $e->getMessage());
    }
}

// ==================== 核心逻辑 ====================

// 1. 读取缓存
$cached = readCache($pdo, $tool);

// 2. 缓存有效 → 直接返回
if ($cached && (time() - $cached['fetched_at']) < CACHE_TTL) {
    $data = json_decode($cached['data'], true);
    echo json_encode(array_merge($data, [
        'ok'     => true,
        'cached' => true,
        'stale'  => false,
        'age'    => time() - $cached['fetched_at'],
        'source' => $cached['source']
    ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 3. 缓存过期 → 检查冷却期（防止频繁抓取）
$isStale = ($cached !== null);
if ($cached && (time() - $cached['fetched_at']) < FETCH_COOLDOWN) {
    // 冷却期内，返回过期缓存但标记为 stale
    $data = json_decode($cached['data'], true);
    echo json_encode(array_merge($data, [
        'ok'     => true,
        'cached' => true,
        'stale'  => true,
        'age'    => time() - $cached['fetched_at'],
        'source' => $cached['source']
    ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// 4. 抓取最新数据
$result = ($tool === 'scripthookv') ? fetchScriptHookV() : fetchScriptHookVDotNet();

// 5. 抓取成功 → 写入缓存
if ($result['ok']) {
    writeCache($pdo, $tool, $result);
    $result['cached'] = false;
    $result['stale']  = false;
    $result['age']    = 0;
} elseif ($cached) {
    // 抓取失败但有旧缓存 → 返回旧缓存
    $data = json_decode($cached['data'], true);
    $result = array_merge($data, [
        'ok'     => true,
        'cached' => true,
        'stale'  => true,
        'age'    => time() - $cached['fetched_at'],
        'source' => $cached['source'] . '_fallback'
    ]);
}

echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// ==================== 缓存读写 ====================

function readCache($pdo, $tool)
{
    if (!$pdo) return null;
    try {
        $stmt = $pdo->prepare("SELECT * FROM `version_cache` WHERE `tool` = ?");
        $stmt->execute([$tool]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        // 表可能被手动删除，尝试重建
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `version_cache` (
                `tool`        VARCHAR(50)  NOT NULL PRIMARY KEY,
                `data`        TEXT         NOT NULL,
                `fetched_at`  INT UNSIGNED NOT NULL,
                `source`      VARCHAR(20)  NOT NULL DEFAULT 'online',
                INDEX idx_fetched (`fetched_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            error_log('[version-proxy] version_cache 表已重建');
        } catch (PDOException $e2) {
            error_log('[version-proxy] version_cache 表重建失败: ' . $e2->getMessage());
        }
        return null;
    }
}

function writeCache($pdo, $tool, $data)
{
    if (!$pdo) return;
    try {
        $stmt = $pdo->prepare("
            INSERT INTO `version_cache` (`tool`, `data`, `fetched_at`, `source`)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                `data` = VALUES(`data`),
                `fetched_at` = VALUES(`fetched_at`),
                `source` = VALUES(`source`)
        ");
        $stmt->execute([
            $tool,
            json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            time(),
            $data['source'] ?? 'online'
        ]);
    } catch (PDOException $e) {
        error_log('[version-proxy] 写入缓存失败 (' . $tool . '): ' . $e->getMessage());
    }
}

// ==================== ScriptHookV ====================

function fetchScriptHookV()
{
    $html = fetchUrl('http://www.dev-c.com/gtav/scripthookv/', [
        'Referer: http://www.dev-c.com/gtav/scripthookv/'
    ]);
    if ($html === null) {
        return ['ok' => false, 'source' => 'error', 'error' => '无法连接到 ScriptHookV 官网'];
    }
    if (preg_match('/v?(\d+\.\d+)\s*\/\s*(\d+\.\d+)/i', $html, $m)) {
        return [
            'ok'       => true,
            'source'   => 'online',
            'legacy'   => $m[1],
            'enhanced' => $m[2],
            'full'     => "v{$m[1]} / {$m[2]}"
        ];
    }
    return ['ok' => false, 'source' => 'error', 'error' => '无法解析版本号'];
}

// ==================== ScriptHookVDotNet ====================

function fetchScriptHookVDotNet()
{
    $json = fetchUrl(
        'https://api.github.com/repos/scripthookvdotnet/scripthookvdotnet-nightly/releases/latest',
        ['Accept: application/vnd.github.v3+json', 'User-Agent: SORA-HUB/1.0']
    );
    if ($json === null) {
        return ['ok' => false, 'source' => 'error', 'error' => '无法连接到 GitHub API'];
    }
    $data = json_decode($json, true);
    if (!$data) {
        return ['ok' => false, 'source' => 'error', 'error' => 'GitHub API 返回无效 JSON'];
    }
    $version     = $data['tag_name'] ?? $data['name'] ?? null;
    $downloadUrl = 'https://github.com/scripthookvdotnet/scripthookvdotnet-nightly/releases';
    if (!empty($data['assets'])) {
        $downloadUrl = $data['assets'][0]['browser_download_url'] ?? $downloadUrl;
    }
    return [
        'ok'          => true,
        'source'      => 'online',
        'version'     => $version,
        'downloadUrl' => $downloadUrl
    ];
}

// ==================== 通用 cURL ====================

function fetchUrl($url, $extraHeaders = [])
{
    if (!function_exists('curl_init')) return null;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_AUTOREFERER    => true,
        CURLOPT_MAXREDIRS      => 3,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => $extraHeaders
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);
    if ($response === false || $httpCode < 200 || $httpCode >= 400) return null;
    return $response;
}
