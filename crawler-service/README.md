# AI平台爬虫服务

基于 Playwright + TypeScript 的AI平台网页自动化爬虫服务。

## 架构

```
Vue前端 → Edge Function → 爬虫服务(Playwright) → AI平台网页
                              ↓
                         DeepSeek API (分析)
                              ↓
                         定时任务（每周一检查）
```

## 功能特性

1. **网页自动化** - 使用 Playwright 模拟用户访问各AI平台
2. **反爬虫机制** - 随机延时、UserAgent轮换、鼠标移动模拟
3. **数据抓取** - 抓取AI回答内容、提及品牌、引用来源
4. **智能分析** - 使用 DeepSeek API 分析品牌可见度
5. **定时检查** - 每周一凌晨自动检查网页结构变化
6. **通知告警** - 支持钉钉、企业微信、Webhook通知

## 支持的AI平台

- DeepSeek
- 豆包
- 元宝
- 通义千问
- 文心一言
- 纳米
- Kimi
- 智谱

## 部署方案选择

### 方案对比

| 方案 | 适合场景 | 费用 | 部署复杂度 |
|------|---------|------|-----------|
| **阿里云函数计算** | 测试阶段、低频调用 | 免费额度充足 | 中等 |
| **Railway** | 生产环境、高频调用 | $5/月免费额度 | 简单 |
| **阿里云ECS** | 大规模生产环境 | ￥100/月起 | 复杂 |

**推荐：测试阶段用阿里云函数计算，生产环境用 Railway**

---

## 部署到阿里云函数计算（测试推荐）

### 1. 准备工作

```bash
# 安装阿里云 Serverless 工具
npm install @serverless-devs/s -g

# 配置阿里云凭证
s config add --AccessKeyID your-access-key --AccessKeySecret your-access-key-secret
```

### 2. 部署

```bash
cd crawler-service
npm install
npm run build
s deploy
```

### 3. 配置 Edge Function

```bash
# 获取部署后的URL
# 例如：https://crawler-xxx.cn-hangzhou.fcapp.run

# 在 Meoo Cloud 设置环境变量
meoo-cli cloud list-functions
# 设置 CRAWLER_SERVICE_URL=https://your-aliyun-url
```

**详细文档**: [DEPLOY-ALIYUN.md](./DEPLOY-ALIYUN.md)

---

## 部署到 Railway（生产推荐）

### 1. 准备代码

```bash
# 确保代码已推送到 GitHub
git add .
git commit -m "Initial crawler service"
git push origin main
```

### 2. 在 Railway 创建项目

1. 访问 [Railway](https://railway.app/) 注册/登录
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的 GitHub 仓库
4. Railway 会自动检测 Dockerfile 并部署

### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

```env
# 必需
DEEPSEEK_API_KEY=sk-c0ad0366305044b9896450756aefd84a
DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions

# 可选 - 通知配置
NOTIFICATION_ENABLED=true
NOTIFICATION_TYPE=dingtalk  # 或 webhook, wecom, email
NOTIFICATION_WEBHOOK_URL=https://oapi.dingtalk.com/robot/send?access_token=xxx
```

### 4. 获取服务地址

部署成功后，Railway 会分配一个域名：
- 例如：`https://ai-crawler-production.up.railway.app`

### 5. 配置 Edge Function

在 Meoo Cloud 中设置爬虫服务地址：

```bash
# 设置环境变量
meoo-cli cloud list-functions
# 然后设置 CRAWLER_SERVICE_URL=https://your-railway-url
```

## 本地开发

```bash
# 1. 进入目录
cd crawler-service

# 2. 安装依赖
npm install

# 3. 安装 Playwright 浏览器
npx playwright install chromium

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 添加 DEEPSEEK_API_KEY

# 5. 开发模式
npm run dev

# 6. 生产构建
npm run build
npm start
```

## API 接口

### 健康检查
```bash
GET /health
GET /health/platforms          # 检查所有平台
GET /health/platform/:platform # 检查单个平台
```

### 爬取数据
```bash
POST /crawl
{
  "platform": "deepseek",
  "question": "定制窗帘哪个品牌服务好",
  "brandName": "美的,小米"
}

POST /crawl/batch
[
  { "platform": "deepseek", "question": "...", "brandName": "..." },
  { "platform": "doubao", "question": "...", "brandName": "..." }
]
```

### 分析结果
```bash
POST /analyze
{
  "platform": "deepseek",
  "brandName": "美的,小米",
  "questions": [...]
}
```

### 完整诊断
```bash
POST /diagnose
{
  "platform": "deepseek",
  "brandName": "美的",
  "industryWord": "定制窗帘",
  "questions": ["{name}哪个品牌服务好", "{name}哪个牌子性价比高"]
}
```

### 手动触发定时任务
```bash
POST /scheduler/trigger
```

## 定时任务

**自动执行**: 每周一凌晨 2:00 (Asia/Shanghai)

**检查内容**:
- 各AI平台网页结构是否正常
- 关键元素（输入框、发送按钮、回答区域）是否存在

**通知方式**:
- 钉钉机器人
- 企业微信机器人
- Webhook
- 邮件

## 反爬虫机制

1. **随机延时**: 3-8秒请求间隔
2. **UserAgent轮换**: 5种不同浏览器
3. **视口随机**: 5种不同分辨率
4. **鼠标移动模拟**: 随机移动2-5次
5. **滚动模拟**: 随机滚动1-3次
6. **人类打字**: 逐字输入，50-150ms间隔
7. **失败重试**: 3次重试，递增延时

## 费用说明

**Playwright**: 完全免费（MIT开源）

**Railway**: 
- 免费额度：$5/月（约35元）
- 超出后按量计费
- 对于小规模使用，免费额度足够

**DeepSeek API**:
- 按调用量计费
- 具体价格参考 DeepSeek 官网

## 注意事项

1. **网页结构变化**: 各AI平台可能更新网页，需要定期检查和更新 selector
2. **反爬虫机制**: 部分平台可能有更强的反爬虫，需要调整延时和随机行为
3. **API Key安全**: 不要将 DEEPSEEK_API_KEY 提交到代码仓库
4. **通知配置**: 建议使用钉钉或企业微信机器人，方便及时收到告警

## 故障排查

### 网页结构变化
```bash
# 手动检查所有平台
curl https://your-service/health/platforms

# 查看具体错误日志
# Railway Dashboard → Deployments → View Logs
```

### 爬取失败
1. 检查目标平台是否可访问
2. 增加延时配置（REQUEST_DELAY_MIN/MAX）
3. 查看日志分析具体错误

### 通知未收到
1. 检查 webhook URL 是否正确
2. 检查钉钉/企业微信机器人是否被禁言
3. 查看服务日志确认通知是否发送

## 更新日志

### v1.0.0
- 初始版本
- 支持8个AI平台
- 集成 DeepSeek 分析
- 添加定时任务和健康检查
- 添加反爬虫机制
