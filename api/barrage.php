<?php
/**
 * SORA-HUB 弹幕 API
 * GET  /api/barrage.php         → 返回弹幕列表
 * POST /api/barrage.php         → 发送新弹幕
 *
 * 首次运行自动建库建表
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ========== 数据库配置 ==========
$config = require __DIR__ . '/config.php';

$DB_HOST = $config['host'];
$DB_PORT = $config['port'];
$DB_NAME = $config['name'];
$DB_USER = $config['user'];
$DB_PASS = $config['pass'];

// ========== 连接数据库 ==========
try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;charset=utf8mb4",
        $DB_USER, $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );

    // 自动建库
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$DB_NAME` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$DB_NAME`");

    // 自动建表
    $pdo->exec("CREATE TABLE IF NOT EXISTS `barrage` (
        `id`    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        `text`  VARCHAR(50)  NOT NULL,
        `color` VARCHAR(9)   NOT NULL DEFAULT '#fff',
        `time`  INT UNSIGNED NOT NULL,
        INDEX idx_time (`time`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 元数据表（用于记录初始化状态等标志位）
    $pdo->exec("CREATE TABLE IF NOT EXISTS `_meta` (
        `key`   VARCHAR(50) NOT NULL PRIMARY KEY,
        `value` VARCHAR(255) NOT NULL DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '数据库连接失败', 'detail' => $e->getMessage()]);
    exit;
}

// ========== 请求处理 ==========

// 初始化预设弹幕（仅首次执行，通过 _meta 表防重复）
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'init') {
    $stmt = $pdo->query("SELECT `value` FROM `_meta` WHERE `key` = 'barrage_initialized'");
    $already = $stmt->fetch();
    if ($already && $already['value'] === '1') {
        echo '{"ok":true,"initialized":true}';
        exit;
    }

    // 兼容旧部署：如果弹幕表已有数据，直接标记为已初始化，不再插入预设
    $countStmt = $pdo->query("SELECT COUNT(*) AS cnt FROM `barrage`");
    $count = (int)$countStmt->fetch()['cnt'];
    if ($count > 0) {
        $pdo->exec("INSERT INTO `_meta` (`key`, `value`) VALUES ('barrage_initialized', '1')
            ON DUPLICATE KEY UPDATE `value` = '1'");
        echo '{"ok":true,"initialized":true}';
        exit;
    }

    $presets = [
        ['欢迎来到 SORA-HUB 🎮', '#F2A900'],
        ['GTA V 永远的神！', '#FF2A6D'],
        ['有没有一起玩 FiveM 的？', '#00E5FF'],
        ['OpenIV 太强了', '#76FF03'],
        ['洛圣都见！', '#E040FB'],
        ['求推荐好看的痛车涂装', '#FFFFFF'],
        ['ScriptHookV 更新了吗', '#F2A900'],
    ];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO `barrage` (`text`, `color`, `time`) VALUES (?, ?, ?)");
        $now = time();
        foreach ($presets as $p) {
            $stmt->execute([$p[0], $p[1], $now]);
        }
        $pdo->exec("INSERT INTO `_meta` (`key`, `value`) VALUES ('barrage_initialized', '1')
            ON DUPLICATE KEY UPDATE `value` = '1'");
        $pdo->commit();
        echo '{"ok":true,"initialized":false}';
    } catch (Exception $e) {
        $pdo->rollBack();
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $max  = min((int)($_GET['max'] ?? 100), 500);
    $stmt = $pdo->query("SELECT `text`, `color`, `time` FROM `barrage` ORDER BY `id` DESC LIMIT $max");
    $rows = $stmt->fetchAll();
    echo json_encode(array_reverse($rows));

} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $text  = trim($input['text']  ?? '');
    $color = $input['color'] ?? '#fff';

    if ($text === '' || mb_strlen($text) > 50) {
        http_response_code(400);
        echo '{"error":"弹幕内容无效"}';
        exit;
    }

    $text  = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
    $color = preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) ? $color : '#fff';
    $time  = time();

    // INSERT 单条记录
    $stmt = $pdo->prepare("INSERT INTO `barrage` (`text`, `color`, `time`) VALUES (?, ?, ?)");
    $stmt->execute([$text, $color, $time]);

    // 定期清理：保留最近 500 条（每 50 次写入触发一次）
    if (mt_rand(1, 50) === 1) {
        $pdo->exec("DELETE FROM `barrage` WHERE `id` NOT IN (SELECT `id` FROM (SELECT `id` FROM `barrage` ORDER BY `id` DESC LIMIT 500) AS tmp)");
    }

    echo '{"ok":true}';

} else {
    http_response_code(405);
    echo '{"error":"Method not allowed"}';
}
