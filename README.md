<h1 align="center">SORA-HUB</h1>

<p align="center">GTA V 模组资源导航 · 融合美漫粗粝与二次元赛博质感的一站式模组门户</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/PHP_8.1-777BB4?style=flat&logo=php&logoColor=white" alt="PHP">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="JavaScript">
</p>

## 项目简介

**SORA-HUB** 是一个面向 GTA V 模组爱好者的资源导航网站，汇集了核心脚本工具、模组下载站、社区资讯与联机平台。页面采用 GTA 美漫风与二次元赛博朋克视觉风格，具备智能版本检测、多下载源管理、Rockstar 服务状态监测和弹幕墙互动等功能。

---

## 功能特性

| 功能 | 说明 |
|:---|:---|
| **视觉风格** | GTA 美漫 × 赛博朋克 · 霓虹发光 · Glitch 故障文字 · 网点背景 |
| **角色立绘轮播** | Banner 区 Crossfade 轮播，淡入淡出 + 缩放模糊过渡，悬停暂停 |
| **智能版本检测** | 自动抓取 ScriptHookV / ScriptHookVDotNet 最新版本并构建下载链接 |
| **服务状态监测** | 实时显示 Rockstar 在线服务运行状态 |
| **弹幕墙** | 实时弹幕互动，支持颜色选择，PHP + MySQL 后端存储 |
| **性能优化** | 图片懒加载 · CSS 异步加载 · `content-visibility` · GPU 加速动画 |
| **响应式布局** | Tailwind CSS 驱动，桌面端 / 平板 / 手机端全适配 |
| **多下载源** | 官网 + 镜像 + 国内站点，确保下载可达性 |
| **安全架构** | 配置外置 · `.htaccess` 保护 · Git 排除敏感文件 |

---

## 项目结构

```
SoraHub/
├── index.html              # 主页面
├── style.css               # 自定义样式
├── version-detector.js     # 版本检测 + 服务状态监测
├── versions.json           # 版本配置（降级备用）
├── .gitignore              # Git 忽略规则
│
├── api/                    # 后端 API
│   ├── barrage.php         # 弹幕接口（MySQL 存储）
│   ├── config.php          # 数据库配置（被 .gitignore 排除）
│   ├── config_example.php  # 配置模板
│   └── .htaccess           # 禁止直接访问配置文件
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

## 部署教程

### 一、本地预览（无需服务器）

```bash
# 方式一：直接打开
# 双击 index.html 即可

# 方式二：本地服务器
python -m http.server 3000
# 或
npx http-server -p 3000
```

访问 `http://localhost:3000`，弹幕功能自动降级为 localStorage 模式。

### 二、服务器部署

#### 环境要求

| 组件 | 用途 | 是否必须 |
|:---|:---|:---|
| Nginx / Apache | Web 服务器 | ✅ 必须 |
| PHP 8.1+ | 弹幕 API 后端 | ✅ 必须（弹幕功能） |
| MySQL 5.7+ | 弹幕数据存储 | ✅ 必须（弹幕功能） |

#### 部署步骤

**1. 上传文件**

将项目文件上传到网站根目录：

```bash
# 确保目录结构正确
/var/www/your-site/
├── index.html
├── style.css
├── version-detector.js
├── api/
│   ├── barrage.php
│   ├── config_example.php  ← 复制为 config.php
│   └── .htaccess
└── ...
```

**2. 配置数据库**

```bash
# 复制配置文件
cp api/config_example.php api/config.php

# 编辑配置文件，填入你的 MySQL 信息
vim api/config.php
```

```php
return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'name' => 'sora_hub',
    'user' => 'sora_user',   // ← 建议创建专用用户，不要用 root
    'pass' => '你的密码',
];
```

**3. 创建数据库用户（推荐）**

```sql
-- 登录 MySQL
CREATE DATABASE IF NOT EXISTS sora_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sora_user'@'localhost' IDENTIFIED BY '强密码';
GRANT SELECT, INSERT, DELETE ON sora_hub.barrage TO 'sora_user'@'localhost';
FLUSH PRIVILEGES;
```

> 首次访问弹幕 API 时会自动建库建表，无需手动创建表结构。

**4. 设置目录权限**

```bash
# 确保 PHP 可写
chmod 755 api/
```

**5. 配置 CDN（可选）**

使用又拍云 / Cloudflare 等 CDN 时，需配置缓存规则：

| 路径 | 缓存策略 |
|:---|:---|
| `/api/*` | ❌ 不缓存（回源到服务器） |
| 其他路径 | ✅ 缓存 24 小时 |

---

## 弹幕墙功能

### 工作模式

弹幕墙支持**自动检测**，根据环境自动选择存储方式：

```
页面加载 → GET /api/barrage.php?max=1
    │
    ├── ✅ 响应成功 → API 模式（MySQL 存储，所有人共享）
    │
    └── ❌ 请求失败 → localStorage 模式（仅本机可见）
```

### API 接口

| 方法 | 路径 | 说明 |
|:---|:---|:---|
| `GET` | `/api/barrage.php?max=100` | 获取最近 N 条弹幕 |
| `POST` | `/api/barrage.php` | 发送弹幕 `{text, color}` |

### 并发安全

采用 MySQL InnoDB 引擎，`INSERT` 语句由数据库引擎保证原子性，多人同时发送弹幕不会丢数据。

---

## 技术细节

### 版本检测系统

`version-detector.js` 采用三层获取策略（直连 → CORS 代理 → 缓存降级）：

1. **ScriptHookV** — 抓取官网页面，正则解析版本号
2. **ScriptHookVDotNet** — 调用 GitHub API 获取最新 nightly release
3. **Rockstar 服务状态** — 抓取官方状态页，解析服务运行状态

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
## 许可声明

本项目遵循 [MIT 许可](LICENSE)

GTA V 及其相关商标归 **Rockstar Games** 所有。

**免责声明**：本网站与 Rockstar Games 或 Take-Two Interactive 无关。Grand Theft Auto 是 Take-Two Interactive 的注册商标。
