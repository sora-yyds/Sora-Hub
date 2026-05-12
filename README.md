<h1 align="center">SORA-HUB</h1>

<p align="center">GTA V 模组资源导航 · 融合美漫粗粝与二次元赛博质感的一站式模组门户</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Font_Awesome-528DD7?style=flat&logo=fontawesome&logoColor=white" alt="Font Awesome">
</p>


##  项目简介

**SORA-HUB** 是一个面向 GTA V 模组爱好者的资源导航网站，汇集了核心脚本工具、模组下载站、社区资讯与联机平台。页面采用 GTA 美漫风与二次元赛博朋克视觉风格，具备智能版本检测、多下载源管理和 Rockstar 服务状态监测等功能。

---

## 功能特性

| 功能 | 说明 |
|:---|:---|
|  **视觉风格** | GTA 美漫 × 赛博朋克 · 霓虹发光 · Glitch 故障文字 · 网点背景 |
|  **角色立绘轮播** | Banner 区 Crossfade 轮播，淡入淡出 + 缩放模糊过渡，悬停暂停 |
|  **智能版本检测** | 自动抓取 ScriptHookV / ScriptHookVDotNet 最新版本并构建下载链接 |
|  **服务状态监测** | 实时显示 Rockstar 在线服务运行状态 |
|  **性能优化** | 图片懒加载 · CSS 异步加载 · `content-visibility` · GPU 加速动画 |
|  **响应式布局** | Tailwind CSS 驱动，桌面端 / 平板 / 手机端全适配 |
|  **多下载源** | 官网 + 镜像 + 国内站点，确保下载可达性 |
|  **自定义字体** | Pricedown（GTA 标志字体）+ Montserrat + Noto Sans SC |

---

## 快速开始

### 方式一：直接打开

双击 `index.html` 即可在浏览器中预览。

### 方式二：本地服务器（推荐）

```bash
# Python
python -m http.server 3000

# Node.js
npx http-server -p 3000
```

访问 `http://localhost:3000`

---

## 项目结构

```
SoraHub/
├── index.html              # 主页面
├── style.css               # 自定义样式
├── version-detector.js     # 版本检测 + 服务状态监测
├── versions.json           # 版本配置（降级备用）
│
├── assets/                 # 静态资源
│   ├── favicon.svg         # 网页图标
│   └── logo.svg            # 导航栏 Logo
│
├── img/                    # 角色立绘轮播图片
│   └── 1.png ~ 4.png
│
├── fonts/                  # 本地字体文件
│   └── Pricedown Bl.otf
│
└── lib/                    # 第三方库
```

---

## 页面模块

### 核心脚本

| 工具 | 说明 | 下载源 |
|:---|:---|:---|
| **ScriptHookV** | C++ 脚本钩子框架，ASI 插件运行基底 | 官网 + Gitee 镜像 |
| **ScriptHookVDotNet** | .NET 脚本引擎 | GitHub + 自建镜像 |
| **OpenIV** | GTA 系列模组管理与文件编辑工具 | 官网 + 3DM Mods |
| **codeWalker** | 交互式 3D 地图编辑器 | GTA5-Mods + 3DM Mods |

### 模组下载站

GTA5-Mods · 3DM Mods · GTAINSide · LibertyCity · GTA5ModHub · GTA-Modding · Mods4U · LCPDFR · Nexus Mods

### 资讯与社区

Rockstar Newswire · GTAForums · Reddit · YouTube · Twitter/X · Discord · Liberty City · iGTA5 · GTA Base · IGN · GTA Wiki

### 联机平台

FiveM · RageMP · Alt:V · RageCoop

---

## 技术细节

### 版本检测系统

`version-detector.js` 通过 CORS 代理抓取外部页面，自动解析版本号并构建下载链接：

1. **ScriptHookV** — 抓取官网页面，正则解析版本号
2. **ScriptHookVDotNet** — 调用 GitHub API 获取最新 nightly release
3. **Rockstar 服务状态** — 抓取官方状态页，解析服务运行状态

失败时自动回退到 `versions.json` 中的硬编码版本号。

### 性能优化

| 优化项 | 实现方式 |
|:---|:---|
| 图片懒加载 | `loading="lazy"` + 显式宽高 |
| CSS 异步加载 | `preload + onload` 模式 |
| 首屏优先级 | `fetchpriority="high"` |
| 布局跳过 | `content-visibility: auto` |
| GPU 加速 | `will-change` + `contain` |

### 视觉设计

- **配色**：`#0a0a0c` · `#FF2A6D` · `#F2A900`
- **字体**：Pricedown · Montserrat · Noto Sans SC
- **动画**：Glitch 故障文字 · 霓虹呼吸灯 · 卡片悬停渐变 · 角色浮动
- **轮播**：Crossfade + `scale` + `blur` 过渡，4 秒自动切换

---
### 版本信息管理

通过 `versions.json` 集中管理：

```json
{
  "tools": {
    "ScriptHookV": {
      "version": "v3788.0 / 1013.34",
      "displayVersion": "v3788.0",
      "downloads": {
        "official": "...",
        "gitee": "..."
      }
    }
  }
}
```

## 设计特色

### 色彩方案

- **主背景色**: `#0a0a0c` (极深色)
- **卡片底色**: `#0f0f12` (深灰黑)
- **GTA 主色调**: `#F2A900` (黄色)
- **穹妹专属色**: `#FF2A6D` (粉色)
- **高亮文字**: `#FFFFFF` (纯白)

### 核心动效

- **毛玻璃效果** - 顶部导航栏 `backdrop-blur`
- **霓虹呼吸灯** - 幽灵图标的脉冲阴影
- **Glitch 故障文字** - 卡片悬停时的文字倾斜
- **图像底部融合** - 立绘下半身渐变消失
- **浮动动画** - 角色图片上下浮动

## 模块组成

### 1. 全局加载动画
- 双环旋转加载器
- 1.5 秒后淡出隐藏

### 2. 顶部导航栏
- Logo + 呼吸灯图标
- 用户头像

### 3. Banner视口区
- 系统管理员标签
- 巨大标题（粉黄渐变）
- 描述段落
- 虚拟形象立绘

### 4. 内容卡片网格
- **核心脚本** - ScriptHookV、ScriptHookVDotNet、OpenIV 等
- **最热前沿** - Rockstar Newswire、GTAForums、Reddit 等
- **进阶工具库** - Menyoo、Rampage Trainer、NativeUI 等
- **模组下载站** - GTA5-Mods.com、LCPDFR、Patreon 等
- **第三方联机** - FiveM、RageMP、Alt:V、RedM

### 5. 页脚
- GTA 五星通缉图标
- 版权免责声明
- Rockstar Games 服务状态

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可声明

本项目遵循 [MIT 许可](LICENSE)

GTA V 及其相关商标归 **Rockstar Games** 所有。

**免责声明**：本网站与 Rockstar Games 或 Take-Two Interactive 无关。Grand Theft Auto 是 Take-Two Interactive 的注册商标。
