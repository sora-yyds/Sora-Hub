<?php
/**
 * SORA-HUB 数据库配置
 * 
 * 此文件通过 .htaccess 禁止浏览器直接访问。
 * 只能被同目录的 PHP 文件通过 include/require 引入。
 */

return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'name' => 'sora_hub',
    'user' => 'sora_hub',     // ← 改为专用数据库用户名（不要用 root）
    'pass' => '',              // ← 改为强密码
];
