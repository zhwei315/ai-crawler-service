# Playwright 自定义层

阿里云函数计算自定义层，用于安装 Playwright 和 Chromium 浏览器。

## 创建自定义层

### 方法1：使用官方层（推荐）

阿里云官方提供了 Playwright 层，可以直接使用：

```yaml
layers:
  - acs:fc:cn-hangzhou:1940309364109785:layers/playwright/versions/1
```

### 方法2：自己创建层

如果官方层不满足需求，可以自己创建：

```bash
# 1. 创建层目录
mkdir -p layer/nodejs

# 2. 安装依赖
cd layer/nodejs
npm init -y
npm install playwright

# 3. 下载浏览器
cd ..
mkdir -p chromium
cd chromium
# 下载 Chromium 浏览器（Linux 版本）
# 可以从 https://chromium.cypress.io/ 下载

# 4. 打包层
cd ..
zip -r playwright-layer.zip nodejs chromium

# 5. 在阿里云控制台上传层
# 函数计算控制台 → 层管理 → 创建层
```

## 层结构

```
playwright-layer.zip
├── nodejs/
│   ├── node_modules/
│   │   └── playwright/
│   └── package.json
└── chromium/
    └── chrome-linux/
        └── chrome
```

## 环境变量

使用自定义层时，需要设置以下环境变量：

```bash
PLAYWRIGHT_BROWSERS_PATH=/opt/chromium
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
```

## 参考

- [阿里云函数计算自定义层文档](https://help.aliyun.com/document_detail/193057.html)
- [Playwright 浏览器下载](https://playwright.dev/docs/browsers)
