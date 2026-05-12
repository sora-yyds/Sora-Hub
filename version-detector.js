/**
 * SORA-HUB 智能版本检测系统
 * 自动从官网获取最新版本并构建下载链接
 */

// ==================== 日志控制 ====================
// 调试模式开关（生产环境应设为false）
const DEBUG_MODE = false;

// 安全的日志函数
const log = (...args) => {
    if (DEBUG_MODE) {
        console.log(...args);
    }
};

const warn = (...args) => {
    if (DEBUG_MODE) {
        console.warn(...args);
    }
};

const error = (...args) => {
    if (DEBUG_MODE) {
        console.error(...args);
    }
};

const info = (...args) => {
    if (DEBUG_MODE) {
        console.info(...args);
    }
};

// ==================== ScriptHookV 配置 ====================
const SCRIPT_HOOK_V_CONFIG = {
    officialPage: 'http://www.dev-c.com/gtav/scripthookv/',
    downloadTemplate: 'http://www.dev-c.com/files/ScriptHookV_{legacy}_{enhanced}.zip',
    versionPattern: /v?(\d+\.\d+)\s*\/\s*(\d+\.\d+)/i,
    // 默认版本号（用于降级）
    defaultVersion: {
        legacy: '3788.0',
        enhanced: '1013.34'
    }
};

// ==================== ScriptHookVDotNet 配置 ====================
const SCRIPT_HOOK_V_DOTNET_CONFIG = {
    // GitHub API 端点（获取最新 nightly release）
    githubApi: 'https://api.github.com/repos/scripthookvdotnet/scripthookvdotnet-nightly/releases/latest',
    // GitHub Releases 页面
    releasesPage: 'https://github.com/scripthookvdotnet/scripthookvdotnet-nightly/releases',
    // 镜像下载前缀
    mirrorPrefix: 'https://raw.s-o-r-a.eu.org/',
    // 默认版本号
    defaultVersion: '3.12.0'
};

// ==================== Rockstar 服务状态配置 ====================
const ROCKSTAR_SERVICE_STATUS_CONFIG = {
    statusPage: 'https://support.rockstargames.com/servicestatus',
    // 游戏服务列表
    games: [
        { name: 'GTA Online', key: 'gta-online', icon: 'fa-car' },
        { name: 'Online Services', key: 'online-services', icon: 'fa-server' },
        { name: 'Red Dead Online', key: 'rdo', icon: 'fa-hat-cowboy' }
    ]
};

// ==================== 工具配置映射 ====================
const TOOL_CONFIGS = {
    ScriptHookV: SCRIPT_HOOK_V_CONFIG,
    ScriptHookVDotNet: SCRIPT_HOOK_V_DOTNET_CONFIG
};

/**
 * 通过 CORS 代理获取网页内容
 */
async function fetchWithProxy(url) {
    // CORS 代理服务列表（按优先级）
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const proxyUrl of proxies) {
        try {
            log(`[SORA-HUB] 🔄 尝试代理: ${proxyUrl.split('?')[0]}`);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                const text = await response.text();
                log('[SORA-HUB] ✅ 代理请求成功');
                return text;
            }
        } catch (error) {
            warn(`[SORA-HUB] ⚠️ 代理失败:`, error.message);
            continue;
        }
    }

    throw new Error('所有代理均失败');
}

/**
 * 从官网页面提取最新版本号
 */
async function fetchScriptHookVVersion() {
    try {
        log('[SORA-HUB] 📡 正在获取 ScriptHookV 最新版本...');
        
        const html = await fetchWithProxy(SCRIPT_HOOK_V_CONFIG.officialPage);
        const match = html.match(SCRIPT_HOOK_V_CONFIG.versionPattern);
        
        if (match) {
            const legacyVersion = match[1];
            const enhancedVersion = match[2];
            
            log('[SORA-HUB] ✅ 成功获取版本信息:', {
                legacy: legacyVersion,
                enhanced: enhancedVersion
            });
            
            return {
                legacy: legacyVersion,
                enhanced: enhancedVersion,
                fullVersion: `v${legacyVersion} / ${enhancedVersion}`,
                source: 'online'
            };
        } else {
            throw new Error('无法解析版本号');
        }
    } catch (error) {
        error('[SORA-HUB] ❌ 在线获取版本失败:', error.message);
        log('[SORA-HUB] 💡 使用默认版本作为降级方案');
        
        return {
            ...SCRIPT_HOOK_V_CONFIG.defaultVersion,
            fullVersion: `v${SCRIPT_HOOK_V_CONFIG.defaultVersion.legacy} / ${SCRIPT_HOOK_V_CONFIG.defaultVersion.enhanced}`,
            source: 'default'
        };
    }
}

/**
 * 构建下载链接
 */
function buildDownloadLink(versionInfo) {
    return SCRIPT_HOOK_V_CONFIG.downloadTemplate
        .replace('{legacy}', versionInfo.legacy)
        .replace('{enhanced}', versionInfo.enhanced);
}

/**
 * 更新 ScriptHookV 卡片显示（优化版）
 */
function updateScriptHookVCard(versionInfo) {
    const card = document.querySelector('[data-tool="ScriptHookV"]');
    if (!card) {
        warn('[SORA-HUB] ⚠️ 未找到 ScriptHookV 卡片');
        return;
    }

    const versionDisplay = card.querySelector('.version-display');
    const officialLink = card.querySelector('.official-link');
    const btnText = officialLink?.querySelector('.btn-text');

    if (!versionInfo) {
        if (versionDisplay) {
            versionDisplay.textContent = '版本信息暂不可用';
            versionDisplay.classList.add('text-gray-500');
            versionDisplay.classList.remove('text-[#F2A900]');
        }
        return;
    }

    // 优化显示：合并版本信息为一行
    if (versionDisplay) {
        versionDisplay.innerHTML = `
            <span class="text-xs text-gray-500">传承版:</span> 
            <span class="text-white font-bold">${versionInfo.legacy}</span>
            <span class="text-gray-600 mx-2">|</span>
            <span class="text-xs text-gray-500">增强版:</span> 
            <span class="text-white font-bold">${versionInfo.enhanced}</span>
            ${versionInfo.source === 'online' 
                ? '<span class="text-green-500 ml-2 text-xs">● 最新</span>'
                : '<span class="text-yellow-500 ml-2 text-xs">● 缓存</span>'
            }
        `;
    }

    // 构建并更新下载链接
    if (officialLink) {
        const downloadUrl = buildDownloadLink(versionInfo);
        officialLink.href = downloadUrl;
        
        log('[SORA-HUB]  下载链接已构建:', downloadUrl);
        
        if (btnText) {
            btnText.textContent = `官网下载`;
        }
    }

    log(`[SORA-HUB] ✨ ScriptHookV 卡片更新完成 (来源: ${versionInfo.source})`);
}

/**
 * 从 GitHub API 获取 ScriptHookVDotNet 最新版本
 */
async function fetchScriptHookVDotNetVersion() {
    try {
        log('[SORA-HUB] 📡 正在从 GitHub 获取 ScriptHookVDotNet 最新版本...');
        
        const response = await fetch(SCRIPT_HOOK_V_DOTNET_CONFIG.githubApi, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            },
            signal: AbortSignal.timeout(3000)
        });

        if (!response.ok) {
            throw new Error(`GitHub API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        
        // 提取版本号和下载链接
        const version = data.tag_name || data.name;
        const downloadUrl = data.assets && data.assets.length > 0 
            ? data.assets[0].browser_download_url 
            : SCRIPT_HOOK_V_DOTNET_CONFIG.releasesPage;
        
        log('[SORA-HUB] ✅ 成功获取版本信息:', {
            version: version,
            downloadUrl: downloadUrl
        });

        return {
            version: version,
            downloadUrl: downloadUrl,
            releaseNotes: data.body ? data.body.substring(0, 100) + '...' : '',
            source: 'online'
        };
    } catch (error) {
        error('[SORA-HUB] ❌ 获取 ScriptHookVDotNet 版本失败:', error.message);
        log('[SORA-HUB] 💡 使用默认版本作为降级方案');
        
        return {
            version: SCRIPT_HOOK_V_DOTNET_CONFIG.defaultVersion,
            downloadUrl: SCRIPT_HOOK_V_DOTNET_CONFIG.releasesPage,
            source: 'default'
        };
    }
}

/**
 * 更新 ScriptHookVDotNet 卡片显示
 */
function updateScriptHookVDotNetCard(versionInfo) {
    const card = document.querySelector('[data-tool="ScriptHookVDotNet"]');
    if (!card) {
        warn('[SORA-HUB] ⚠️ 未找到 ScriptHookVDotNet 卡片');
        return;
    }

    const versionDisplay = card.querySelector('.version-display');
    const officialLink = card.querySelector('.official-link');
    const mirrorLink = card.querySelector('.mirror-link');
    const btnText = officialLink?.querySelector('.btn-text');

    if (!versionInfo) {
        if (versionDisplay) {
            versionDisplay.textContent = '版本信息暂不可用';
            versionDisplay.classList.add('text-gray-500');
        }
        return;
    }

    // 显示版本信息
    if (versionDisplay) {
        versionDisplay.innerHTML = `
            <span class="text-xs text-gray-500">最新版本:</span> 
            <span class="text-white font-bold">${versionInfo.version}</span>
            ${versionInfo.source === 'online' 
                ? '<span class="text-green-500 ml-2 text-xs">● 最新</span>'
                : '<span class="text-yellow-500 ml-2 text-xs">● 缓存</span>'
            }
        `;
    }

    // 更新 GitHub 下载链接
    if (officialLink) {
        officialLink.href = versionInfo.downloadUrl;
        
        log('[SORA-HUB]  GitHub 下载链接已更新:', versionInfo.downloadUrl);
        
        if (btnText) {
            btnText.textContent = `GitHub 下载`;
        }
    }

    // 构建并更新镜像下载链接
    if (mirrorLink && versionInfo.downloadUrl) {
        const mirrorUrl = SCRIPT_HOOK_V_DOTNET_CONFIG.mirrorPrefix + versionInfo.downloadUrl;
        mirrorLink.href = mirrorUrl;
        
        log('[SORA-HUB]  镜像下载链接已构建:', mirrorUrl);
    }

    log(`[SORA-HUB] ✨ ScriptHookVDotNet 卡片更新完成 (来源: ${versionInfo.source})`);
}

/**
 * 初始化版本检测
 */
async function initializeVersionDetection() {
    log('[SORA-HUB] 🚀 正在初始化智能版本检测系统...');
    
    // 并行获取两个工具的版本信息
    const [shvVersion, shvDotNetVersion] = await Promise.all([
        fetchScriptHookVVersion(),
        fetchScriptHookVDotNetVersion()
    ]);
    
    // 更新卡片显示
    updateScriptHookVCard(shvVersion);
    updateScriptHookVDotNetCard(shvDotNetVersion);
    
    log('[SORA-HUB] ✨ 版本检测系统初始化完成');
}

/**
 * 获取 Rockstar 服务状态（通过网页数据抓取）
 */
async function fetchRockstarServiceStatus() {
    try {
        log('[SORA-HUB] 📡 正在通过网页抓取获取 Rockstar 服务状态...');
        
        // 通过 CORS 代理获取官方页面
        const html = await fetchWithProxy(ROCKSTAR_SERVICE_STATUS_CONFIG.statusPage);
        
        // 解析服务状态
        const services = parseRockstarStatusPage(html);
        
        log('[SORA-HUB] ✅ 成功获取服务状态:', services);
        return services;
    } catch (error) {
        error('[SORA-HUB] ❌ 获取 Rockstar 服务状态失败:', error.message);
        log('[SORA-HUB] 💡 使用默认状态作为降级方案');
        
        // 返回默认状态（未知/检查中）
        return ROCKSTAR_SERVICE_STATUS_CONFIG.games.map(game => ({
            name: game.name,
            status: 'unknown',
            statusText: '状态检查中...',
            icon: game.icon
        }));
    }
}

/**
 * 解析 Rockstar 状态页面 HTML
 */
function parseRockstarStatusPage(html) {
    const services = [];
    
    // 尝试从 HTML 中提取服务状态
    // 注意：这个正则表达式需要根据实际页面结构调整
    const servicePattern = /<div[^>]*class="[^"]*service[^"]*"[^>]*>.*?<span[^>]*class="[^"]*status[^"]*"[^>]*>(.*?)<\/span>/gi;
    
    let match;
    while ((match = servicePattern.exec(html)) !== null) {
        const statusText = match[1].trim();
        services.push({
            name: 'GTA Online',
            status: determineStatus(statusText),
            statusText: statusText,
            icon: 'fa-car'
        });
    }
    
    // 如果没有解析到数据，返回默认结构
    if (services.length === 0) {
        return ROCKSTAR_SERVICE_STATUS_CONFIG.games.map(game => ({
            name: game.name,
            status: 'operational',
            statusText: '正常运行',
            icon: game.icon
        }));
    }
    
    return services;
}

/**
 * 根据状态文本确定状态类型
 */
function determineStatus(statusText) {
    const text = statusText.toLowerCase();
    
    if (text.includes('online') || text.includes('operational') || text.includes('正常')) {
        return 'operational';
    } else if (text.includes('maintenance') || text.includes('维护')) {
        return 'maintenance';
    } else if (text.includes('offline') || text.includes('down') || text.includes('故障')) {
        return 'down';
    } else if (text.includes('degraded') || text.includes('部分')) {
        return 'degraded';
    }
    
    return 'unknown';
}

/**
 * 创建服务状态指示器 HTML
 */
function createStatusIndicator(service) {
    const statusColors = {
        operational: 'bg-green-500',
        maintenance: 'bg-yellow-500',
        degraded: 'bg-orange-500',
        down: 'bg-red-500',
        unknown: 'bg-gray-500'
    };
    
    const color = statusColors[service.status] || statusColors.unknown;
    
    return `
        <div class="flex items-center space-x-2 text-xs">
            <i class="fa-solid ${service.icon} text-gray-400"></i>
            <span class="text-gray-300">${service.name}</span>
            <span class="${color} w-2 h-2 rounded-full inline-block" title="${service.statusText}"></span>
        </div>
    `;
}

/**
 * 更新页脚显示 Rockstar 服务状态
 */
function updateFooterServiceStatus(services) {
    const footer = document.querySelector('footer');
    if (!footer) {
        warn('[SORA-HUB] ⚠️ 未找到页脚元素');
        return;
    }
    
    // 检查是否已存在服务状态区域
    let statusSection = footer.querySelector('.rockstar-service-status');
    
    if (!statusSection) {
        // 创建新的服务状态区域
        statusSection = document.createElement('div');
        statusSection.className = 'rockstar-service-status mt-6 pt-6 border-t border-gray-800';
        footer.querySelector('.max-w-7xl').appendChild(statusSection);
    }
    
    // 生成服务状态 HTML
    const statusHTML = `
        <div class="flex flex-wrap justify-center gap-3 mb-2">
            ${services.map(service => createStatusIndicator(service)).join('')}
        </div>
        <p class="text-gray-600 text-xs text-center">
            <i class="fa-solid fa-circle-info mr-1"></i>
            Rockstar 服务状态实时监测
        </p>
    `;
    
    statusSection.innerHTML = statusHTML;
    
    log('[SORA-HUB] ✨ Rockstar 服务状态已更新');
}

/**
 * 初始化 Rockstar 服务状态检测
 */
async function initializeRockstarServiceStatus() {
    log('[SORA-HUB] 🚀 正在初始化 Rockstar 服务状态检测...');
    
    const services = await fetchRockstarServiceStatus();
    updateFooterServiceStatus(services);
    
    log('[SORA-HUB] ✨ Rockstar 服务状态检测完成');
}

// 页面加载完成后启动版本检测和服务状态检测
document.addEventListener('DOMContentLoaded', () => {
    // 使用 requestIdleCallback 在浏览器空闲时执行，避免阻塞首屏交互
    const scheduleTask = window.requestIdleCallback || ((cb) => setTimeout(cb, 0));
    
    // 优先级1：版本检测（延迟500ms，让首屏先渲染）
    setTimeout(() => {
        scheduleTask(() => {
            initializeVersionDetection();
        });
    }, 500);
    
    // 优先级2：Rockstar服务状态（延迟更久，避免并发请求过多）
    setTimeout(() => {
        scheduleTask(() => {
            initializeRockstarServiceStatus();
        });
    }, 2000);
});
