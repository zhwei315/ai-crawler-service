# Railway 部署指南

## 概述

Railway 是一个现代化的应用部署平台，支持 Docker 部署，非常适合运行 Playwright 浏览器自动化服务。

**优势：**
- 原生支持 Docker，可预装 Chromium
- 自动 HTTPS 和域名
- 自动扩缩容
- 环境变量管理方便
- 免费额度：每月 $5 或 500 小时运行时间

## 部署步骤

### 1. 准备工作

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录 Railway
railway login
```

### 2. 初始化项目

```bash
cd crawler-service

# 初始化 Railway 项目
railway init

# 或者关联已有项目
railway link
```

### 3. 设置环境变量

在 Railway Dashboard 或使用 CLI 设置环境变量：

```bash
# 设置 DeepSeek API Key
railway variables set DEEPSEEK_API_KEY=sk-c0ad0366305044b9896450756aefd84a

# 设置其他环境变量
railway variables set DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
railway variables set REQUEST_DELAY_MIN=3000
railway variables set REQUEST_DELAY_MAX=8000
railway variables set BROWSER_TIMEOUT=120000
railway variables set MAX_CONCURRENT_BROWSERS=1
railway variables set NOTIFICATION_ENABLED=false
```

### 4. 部署

```bash
# 部署到 Railway
railway up

# 查看部署状态
railway status

# 查看日志
railway logs
```

### 5. 获取服务地址

部署成功后，Railway 会自动分配域名：

```
https://your-service-name.up.railway.app
```

在 Railway Dashboard 中查看：
- Settings → Domains

## 费用估算

| 配置 | 月费用 | 说明 |
|------|--------|------|
| 1 CPU, 512MB | 免费 | 在免费额度内 |
| 1 CPU, 1GB | 约 $5 | 超出免费额度部分 |
| 2 CPU, 2GB | 约 $10 | 推荐配置 |
| 2 CPU, 4GB | 约 $20 | 高性能配置 |

**免费额度：**
- $5 或 500 小时运行时间/月
- 对于测试阶段完全够用

## 监控和日志

### 查看日志

```bash
# 实时查看日志
railway logs --follow

# 查看最近 100 行
railway logs --lines 100
```

### 监控指标

在 Railway Dashboard 查看：
- CPU 使用率
- 内存使用
- 网络流量
- 磁盘使用

## 更新部署

```bash
# 修改代码后重新部署
railway up
```

## 删除服务

```bash
# 在 Dashboard 中删除项目
# 或使用 CLI
railway down
```

## 参考文档

- [Railway 文档](https://docs.railway.app/)
- [Railway CLI 文档](https://docs.railway.app/develop/cli)
- [Playwright Docker 文档](https://playwright.dev/docs/docker)
