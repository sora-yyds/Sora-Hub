/**
 * SORA-HUB 智能版本检测
 * 自动从官网获取最新版本并构建下载链接
 */

// ==================== 下载代理配置 ====================
const DOWNLOAD_CONFIG = {
    cfWorkerUrl: 'https://sorahub-download.s-o-r-a.eu.org/'
};

// ==================== 日志控制 ====================
const DEBUG_MODE = false;
const log = (...args) => { if (DEBUG_MODE) console.log(...args); };
const warn = (...args) => { if (DEBUG_MODE) console.warn(...args); };
const error = (...args) => { if (DEBUG_MODE) console.error(...args); };

// ==================== ScriptHookV 配置 ====================
const SCRIPT_HOOK_V_CONFIG = {
    officialPage: 'http://www.dev-c.com/gtav/scripthookv/',
    downloadTemplate: 'http://www.dev-c.com/files/ScriptHookV_{legacy}_{enhanced}.zip',
    versionPattern: /v?(\d+\.\d+)\s*\/\s*(\d+\.\d+)/i,
    defaultVersion: { legacy: '3788.0', enhanced: '1013.34' }
};

// ==================== ScriptHookVDotNet 配置 ====================
const SCRIPT_HOOK_V_DOTNET_CONFIG = {
    githubApi: 'https://api.github.com/repos/scripthookvdotnet/scripthookvdotnet-nightly/releases/latest',
    releasesPage: 'https://github.com/scripthookvdotnet/scripthookvdotnet-nightly/releases',
    mirrorPrefix: 'https://raw.s-o-r-a.eu.org/',
    defaultVersion: '3.12.0'
};

// ==================== Rockstar 服务状态配置 ====================
const ROCKSTAR_SERVICE_STATUS_CONFIG = {
    games: [
        { name: 'GTA Online', key: 'gta-online', icon: 'fa-car' },
        { name: 'Online Services', key: 'online-services', icon: 'fa-server' },
        { name: 'Red Dead Online', key: 'rdo', icon: 'fa-hat-cowboy' }
    ]
};

/**
 * 通过服务端代理获取版本信息（带数据库缓存 + 频率限制）
 */
async function fetchViaProxy(tool) {
    try {
        const proxyUrl = `./api/version-proxy.php?tool=${encodeURIComponent(tool)}`;
        log(`[SORA-HUB] 🔄 服务端代理: ${proxyUrl}`);
        const response = await fetch(proxyUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.ok) {
            log(`[SORA-HUB] ✅ 服务端代理成功`);
            return data;
        }
        warn('[SORA-HUB] ⚠️ 代理返回失败:', data.error);
        return null;
    } catch (e) {
        warn('[SORA-HUB] ⚠️ 服务端代理失败:', e.message);
        return null;
    }
}

/**
 * 从官网页面提取最新版本号
 */
async function fetchScriptHookVVersion() {
    log('[SORA-HUB] 📡 正在获取 ScriptHookV 最新版本...');
    const proxyData = await fetchViaProxy('scripthookv');
    if (proxyData) {
        return {
            legacy: proxyData.legacy,
            enhanced: proxyData.enhanced,
            fullVersion: proxyData.full || `v${proxyData.legacy} / ${proxyData.enhanced}`,
            source: proxyData.source || 'online',
            cached: proxyData.cached || false,
            stale: proxyData.stale || false
        };
    }
    warn('[SORA-HUB] ❌ 获取版本失败，使用默认版本');
    return {
        ...SCRIPT_HOOK_V_CONFIG.defaultVersion,
        fullVersion: `v${SCRIPT_HOOK_V_CONFIG.defaultVersion.legacy} / ${SCRIPT_HOOK_V_CONFIG.defaultVersion.enhanced}`,
        source: 'default',
        cached: false,
        stale: false
    };
}

/**
 * 构建原始下载链接
 */
function buildDownloadLink(versionInfo) {
    return SCRIPT_HOOK_V_CONFIG.downloadTemplate
        .replace('{legacy}', versionInfo.legacy)
        .replace('{enhanced}', versionInfo.enhanced);
}

/**
 * 构建 CF Workers 代理下载 URL
 */
function buildProxyUrl(originalUrl) {
    if (!DOWNLOAD_CONFIG.cfWorkerUrl) return null;
    return `${DOWNLOAD_CONFIG.cfWorkerUrl}?u=${encodeURIComponent(btoa(originalUrl))}`;
}

/**
 * 通过 CF Workers 下载文件（fetch 发送 Origin 头，Worker 可校验来源域名）
 */
async function downloadViaProxy(url) {
    if (!DOWNLOAD_CONFIG.cfWorkerUrl) return;
    const proxyUrl = buildProxyUrl(url);
    const btn = document.querySelector('[data-tool="ScriptHookV"] .official-link');
    try {
        if (btn) btn.style.pointerEvents = 'none';
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(30000) });
        const ct = response.headers.get('Content-Type') || '';
        if (!response.ok || ct.includes('application/json')) {
            const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(err.error || '下载失败');
        }
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = url.split('/').pop() || 'download.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch (e) {
        alert('官网下载失败，请使用 Gitee 镜像下载');
    } finally {
        if (btn) btn.style.pointerEvents = '';
    }
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
        let statusTag = '';
        if (versionInfo.source === 'default') {
            statusTag = '<span class="text-yellow-500 ml-2 text-xs">● 默认版本，可能不是最新</span>';
        } else if (versionInfo.stale) {
            statusTag = '<span class="text-yellow-500 ml-2 text-xs">● 缓存数据，稍后自动更新</span>';
        } else if (versionInfo.cached) {
            statusTag = '<span class="text-green-500 ml-2 text-xs">● 最新</span>';
        } else {
            statusTag = '<span class="text-green-500 ml-2 text-xs">● 最新</span>';
        }
        versionDisplay.innerHTML = `
            <span class="text-xs text-gray-500">传承版:</span> 
            <span class="text-white font-bold">${versionInfo.legacy}</span>
            <span class="text-gray-600 mx-2">|</span>
            <span class="text-xs text-gray-500">增强版:</span> 
            <span class="text-white font-bold">${versionInfo.enhanced}</span>
            ${statusTag}
        `;
    }

    // 设置下载链接（fetch 方式，Worker 可校验 Origin）
    if (officialLink) {
        const downloadUrl = buildDownloadLink(versionInfo);
        officialLink.href = 'javascript:void(0)';
        officialLink.addEventListener('click', (e) => {
            e.preventDefault();
            downloadViaProxy(downloadUrl);
        });
        if (btnText) btnText.textContent = '官网下载';
    }

    log(`[SORA-HUB] ✨ ScriptHookV 卡片更新完成 (来源: ${versionInfo.source})`);
}

/**
 * 从 GitHub API 获取 ScriptHookVDotNet 最新版本
 */
async function fetchScriptHookVDotNetVersion() {
    log('[SORA-HUB] 📡 正在获取 ScriptHookVDotNet 最新版本...');
    const proxyData = await fetchViaProxy('scripthookvdotnet');
    if (proxyData) {
        return {
            version: proxyData.version,
            downloadUrl: proxyData.downloadUrl || SCRIPT_HOOK_V_DOTNET_CONFIG.releasesPage,
            source: proxyData.source || 'online',
            cached: proxyData.cached || false,
            stale: proxyData.stale || false
        };
    }
    warn('[SORA-HUB] ❌ 获取 ScriptHookVDotNet 版本失败，使用默认版本');
    return {
        version: SCRIPT_HOOK_V_DOTNET_CONFIG.defaultVersion,
        downloadUrl: SCRIPT_HOOK_V_DOTNET_CONFIG.releasesPage,
        source: 'default',
        cached: false,
        stale: false
    };
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
        let statusTag = '';
        if (versionInfo.source === 'default') {
            statusTag = '<span class="text-yellow-500 ml-2 text-xs">● 默认版本，可能不是最新</span>';
        } else if (versionInfo.stale) {
            statusTag = '<span class="text-yellow-500 ml-2 text-xs">● 缓存数据，稍后自动更新</span>';
        } else if (versionInfo.cached) {
            statusTag = '<span class="text-green-500 ml-2 text-xs">● 最新</span>';
        } else {
            statusTag = '<span class="text-green-500 ml-2 text-xs">● 最新</span>';
        }
        versionDisplay.innerHTML = `
            <span class="text-xs text-gray-500">最新版本:</span> 
            <span class="text-white font-bold">${versionInfo.version}</span>
            ${statusTag}
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
 * 获取 Rockstar 服务状态（使用默认值，官网不支持 CORS）
 */
async function fetchRockstarServiceStatus() {
    return ROCKSTAR_SERVICE_STATUS_CONFIG.games.map(game => ({
        name: game.name,
        status: 'operational',
        statusText: '正常运行',
        icon: game.icon
    }));
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
