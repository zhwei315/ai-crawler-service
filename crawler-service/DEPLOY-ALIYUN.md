# 阿里云函数计算部署指南

## 概述

阿里云函数计算（Function Compute）是事件驱动的全托管计算服务，适合低频调用的爬虫服务。

**优势：**
- 免费额度：100万次调用/月 + 40万GB-秒
- 按量计费：测试阶段几乎免费
- 自动扩缩容：无需管理服务器

**限制：**
- 执行时间：最长10分钟
- 内存：最大16GB
- 冷启动：3-10秒（长时间不调用后）

## 部署步骤

### 1. 准备工作

```bash
# 安装阿里云 Serverless 工具
npm install @serverless-devs/s -g

# 配置阿里云凭证
s config add --AccessKeyID your-access-key --AccessKeySecret your-access-key-secret

# 或使用阿里云 CLI
npm install @alicloud/fun -g
fun config
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-c0ad0366305044b9896450756aefd84a
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# 爬虫配置
MAX_CONCURRENT_BROWSERS=1
BROWSER_TIMEOUT=300000
REQUEST_DELAY_MIN=3000
REQUEST_DELAY_MAX=8000

# 通知配置
NOTIFICATION_ENABLED=true
NOTIFICATION_TYPE=webhook
NOTIFICATION_WEBHOOK_URL=https://your-webhook-url
```

### 3. 部署服务

```bash
# 进入爬虫服务目录
cd crawler-service

# 安装依赖
npm install

# 构建
npm run build

# 部署到阿里云函数计算
s deploy
```

### 4. 获取服务地址

部署成功后，会输出服务地址：

```
Service: ai-crawler-service
Function: crawler
URL: https://crawler-xxx.cn-hangzhou.fcapp.run
```

### 5. 配置 Edge Function

在 Meoo Cloud 中设置爬虫服务地址：

```bash
# 设置环境变量
meoo-cli cloud list-functions
# 然后设置 CRAWLER_SERVICE_URL=https://your-aliyun-url
```

## 费用估算

| 调用次数 | 执行时间 | 内存 | 费用 |
|---------|---------|------|------|
| 1000次/月 | 10秒/次 | 4GB | 免费（在免费额度内） |
| 10000次/月 | 10秒/次 | 4GB | 约￥5-10 |
| 100000次/月 | 10秒/次 | 4GB | 约￥50-100 |

**免费额度：**
- 调用次数：100万次/月
- 执行时间：40万GB-秒/月

## 监控和日志

### 查看日志

```bash
# 使用 s 工具查看日志
s logs

# 或在阿里云控制台查看
# 函数计算控制台 → 服务 → 函数 → 日志查询
```

### 监控指标

在阿里云控制台查看：
- 调用次数
- 执行时间
- 错误率
- 内存使用

## 常见问题

### 1. 冷启动慢

**原因**：长时间不调用后，函数需要重新初始化浏览器

**解决**：
- 使用预留实例（需要付费）
- 或接受冷启动延迟（测试阶段可接受）

### 2. 浏览器启动失败

**原因**：Playwright 层未正确配置

**解决**：
- 检查层是否正确引用
- 检查环境变量 `PLAYWRIGHT_BROWSERS_PATH`

### 3. 执行超时

**原因**：爬虫任务超过10分钟限制

**解决**：
- 减少单次爬取的问题数量
- 或拆分为多个函数调用

### 4. 内存不足

**原因**：Chromium 浏览器占用内存较大

**解决**：
- 增加函数内存配置（s.yaml 中的 memorySize）
- 或减少并发浏览器数量

## 更新部署

```bash
# 修改代码后重新部署
npm run build
s deploy
```

## 删除服务

```bash
s remove
```

## 参考文档

- [阿里云函数计算文档](https://help.aliyun.com/product/50980.html)
- [Serverless Devs 文档](https://www.serverless-devs.com/)
- [Playwright 文档](https://playwright.dev/)
