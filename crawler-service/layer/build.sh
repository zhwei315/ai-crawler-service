#!/bin/bash
# Playwright 自定义层构建脚本

set -e

echo "[Build] Building Playwright layer..."

# 创建目录
mkdir -p layer/nodejs
mkdir -p layer/chromium

# 安装 Playwright
cd layer/nodejs
npm init -y
npm install playwright@1.40.0

# 下载 Chromium 浏览器
cd ..
echo "[Build] Downloading Chromium..."

# 使用 Playwright 下载浏览器
npx playwright install chromium

# 查找浏览器安装路径
BROWSER_PATH=$(find ~/.cache/ms-playwright -name "chrome-linux" -type d 2>/dev/null | head -1)

if [ -z "$BROWSER_PATH" ]; then
    echo "[Build] Browser not found, trying alternative path..."
    BROWSER_PATH=$(find /root/.cache/ms-playwright -name "chrome-linux" -type d 2>/dev/null | head -1)
fi

if [ -n "$BROWSER_PATH" ]; then
    echo "[Build] Found browser at: $BROWSER_PATH"
    cp -r "$BROWSER_PATH"/* chromium/
else
    echo "[Build] Warning: Browser not found, will download at runtime"
fi

# 打包
cd ..
echo "[Build] Creating layer zip..."
zip -r playwright-layer.zip layer/nodejs layer/chromium -x "*/node_modules/.cache/*" -x "*/.npm/*"

echo "[Build] Layer built: playwright-layer.zip"
echo "[Build] Upload this file to Alibaba Cloud Function Compute console"
