<h1 align="center">SORA-HUB</h1>

<p align="center">GTA V 模组资源导航 · 一站式模组门户</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/PHP_8.1-777BB4?style=flat&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
</p>

## 项目简介

**SORA-HUB** 是一个面向 GTA V 模组爱好者的资源导航网站，汇集了核心脚本工具、模组下载站、社区资讯与联机平台。页面采用 GTA 美漫风与二次元赛博朋克视觉风格，具备智能版本检测、多下载源管理、Rockstar 服务状态监测和弹幕墙互动等功能。

## 功能特性

- **智能版本检测** — 自动抓取 ScriptHookV / ScriptHookVDotNet 最新版本，MySQL 缓存 + 频率限制，表删除后自动重建
- **代理下载** — 通过 Cloudflare Workers 代理下载，绕过防盗链
- **弹幕墙** — 实时弹幕互动，PHP + MySQL 后端存储，预设弹幕通过后端幂等初始化（防重复写入），无后端时自动降级 localStorage
- **Rockstar 服务状态** — 展示 GTA Online 等服务运行状态
- **角色立绘轮播** — Crossfade 过渡动画，悬停暂停
- **响应式布局** — Tailwind CSS 驱动，桌面 / 平板 / 手机全适配
- **视觉风格** — GTA 美漫 × 赛博朋克，霓虹发光 + Glitch 故障文字

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | HTML5 · Tailwind CSS · JavaScript |
| 后端 | PHP 8.1+ · MySQL 5.7+ |
| 下载代理 | Cloudflare Workers |
| CDN | 又拍云 / Cloudflare |

## 快速开始

### 本地预览

```bash
# 直接打开 index.html，或使用本地服务器
python -m http.server 3000
# 访问 http://localhost:3000
```

弹幕功能自动降级为 localStorage 模式，无需后端。

### 服务器部署

**环境要求**：Nginx/Apache + PHP 8.1+ + MySQL 5.7+

```bash
# 1. 上传项目文件到网站根目录

# 2. 配置数据库
cp api/config_example.php api/config.php
# 编辑 config.php 填入 MySQL 连接信息

# 3. 首次访问时自动建库建表（barrage、_meta、version_cache），无需手动建表
```

### Cloudflare Workers（下载代理）

用于代理 ScriptHookV 官网下载，绕过防盗链：

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com) 创建 Worker
2. 粘贴 `cf-download-worker.js` 中的代码并部署
3. 在 `version-detector.js` 的 `DOWNLOAD_CONFIG.cfWorkerUrl` 填入 Worker 地址

## 项目结构

```
SoraHub/
├── index.html              # 主页面
├── style.css               # 自定义样式
├── version-detector.js     # 版本检测 + 下载代理
├── cf-download-worker.js   # Cloudflare Worker 下载代理脚本
├── api/
│   ├── barrage.php         # 弹幕 API（含预设弹幕幂等初始化）
│   ├── version-proxy.php   # 版本检测代理（MySQL 缓存 + 防御性表重建）
│   ├── config.php          # 数据库配置（.gitignore 排除）
│   └── config_example.php  # 配置模板
├── assets/                 # Logo / Favicon
├── docs/                   # 项目文档
│   └── cdn-setup-upyun.md  # 又拍云 CDN 配置指南
├── img/                    # 角色立绘
├── fonts/                  # 本地字体
└── lib/                    # 第三方库
```

## 版本检测频率限制

版本检测代理 (`version-proxy.php`) 采用两级缓存策略，避免频繁请求目标网站被封 IP：

| 参数 | 值 | 说明 |
|---|---|---|
| 缓存有效期 | 2 小时 | 直接返回数据库缓存，视为「最新」 |
| 抓取冷却 | 2.5 小时 | 即使缓存过期也不重新抓取，返回过期缓存 |

### 前端状态显示
    
| 后端状态 | 前端显示 | 含义 |
|---|---|---|
| 实时抓取成功 | `● 最新`（绿色） | 成功从官网获取最新数据 |
| 缓存命中（2h 内） | `● 最新`（绿色） | 数据库缓存有效，无需请求外部 |
| 过期缓存（2h~2.5h 内） | `● 缓存数据，稍后自动更新`（黄色） | 缓存过期，但冷却期内，稍后自动更新 |） | `● 缓存数据，稍后自动更新`（黄色） | 缓存过期但冷却期内，稍后自动更新 |
| 全部失败 | `● 默认版本，可能不是最新`（黄色） | 抓取失败且无任何缓存，使用内置默认值 |

## 许可

本项目遵循 [MIT 许可](LICENSE)。

GTA V 及其相关商标归 **Rockstar Games** 所有。

**免责声明**：本网站与 Rockstar Games 或 Take-Two Interactive 无关。Grand Theft Auto 是 Take-Two Interactive 的注册商标。