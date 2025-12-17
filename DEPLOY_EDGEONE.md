# EdgeOne 部署指南

本文档说明如何将真心话/大冒险项目部署到腾讯云 EdgeOne。

## 一、前置准备

### 1.1 账号与服务

- ✅ 腾讯云账号
- ✅ 开通 EdgeOne 服务
- ✅ （可选）已备案域名

### 1.2 本地准备

- ✅ 完成项目开发和测试
- ✅ 代码已推送到 GitHub

## 二、推送代码到 GitHub

### 2.1 配置 Git 远程仓库

项目已配置远程仓库：
```bash
origin  https://github.com/ethanchangrs-droid/truthordare.git
```

### 2.2 手动推送代码

由于自动推送遇到认证问题，请手动执行以下步骤：

**方法 1：使用 GitHub Personal Access Token**

1. 创建 Personal Access Token：
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 选择权限：至少勾选 `repo`
   - 生成并复制 token

2. 推送代码：
```bash
cd /Users/david/Desktop/pitem/TruthorDare
git push https://YOUR_TOKEN@github.com/ethanchangrs-droid/truthordare.git main
```

**方法 2：使用 SSH**

1. 配置 SSH Key（如未配置）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub  # 复制公钥
```

2. 添加到 GitHub：
   - 访问：https://github.com/settings/keys
   - 添加 SSH Key

3. 修改远程仓库地址：
```bash
cd /Users/david/Desktop/pitem/TruthorDare
git remote set-url origin git@github.com:ethanchangrs-droid/truthordare.git
git push -u origin main
```

**方法 3：使用 GitHub Desktop 或 VS Code**

直接在 GitHub Desktop 或 VS Code 的 Git 扩展中进行推送。

### 2.3 验证推送

访问 https://github.com/ethanchangrs-droid/truthordare 确认代码已上传。

## 三、部署 Web 前端到 EdgeOne

### 3.1 构建 Web 应用

```bash
cd /Users/david/Desktop/pitem/TruthorDare/web
npm install
npm run build
```

构建完成后，产物在 `web/dist` 目录。

### 3.2 EdgeOne 静态网站托管

#### 方式 1：通过 EdgeOne 控制台

1. 登录 EdgeOne 控制台：https://console.cloud.tencent.com/edgeone

2. 创建站点：
   - 选择"静态网站加速"
   - 输入域名（或使用 EdgeOne 提供的测试域名）

3. 上传静态资源：
   - 进入"静态网站托管"
   - 上传 `web/dist` 目录下的所有文件
   - 设置根目录为 `index.html`

4. 配置路由规则：
   - 单页应用（SPA）需要配置 fallback 到 `index.html`
   - 规则示例：`/*` → `/index.html`

#### 方式 2：通过 CLI

```bash
# 安装 EdgeOne CLI（根据实际情况）
npm install -g @edgeone/cli

# 部署
edgeone deploy --dir web/dist
```

### 3.3 配置 API 代理

**方法 1：EdgeOne 反向代理**

在 EdgeOne 控制台配置规则：
- 路径匹配：`/api/*`
- 目标源站：你的后端服务地址（如 `https://your-backend-server.com`）

**方法 2：修改前端代码**

如果不使用反向代理，需要修改前端 API 地址：

```javascript
// web/src/App.jsx
const API_BASE_URL = 'https://your-backend-api.com';

fetch(`${API_BASE_URL}/api/generate`, {
  // ...
});
```

## 四、部署后端服务

EdgeOne 主要用于前端托管，后端需要单独部署。

### 4.1 推荐方案

**方案 1：腾讯云 Serverless（推荐）**

优点：
- ✅ 按量计费，成本低
- ✅ 自动扩缩容
- ✅ 无需运维

部署步骤：
1. 访问 Serverless 控制台
2. 创建函数（Node.js 16+）
3. 上传 `backend` 代码
4. 配置环境变量（LLM_API_KEY 等）
5. 配置触发器（API 网关）

**方案 2：腾讯云轻量应用服务器**

适合：需要持久运行的场景

**方案 3：其他服务**
- Vercel（支持 Node.js）
- Railway
- Render
- 自建服务器

### 4.2 后端环境变量配置

无论使用哪种方案，都需要配置以下环境变量：

```bash
# 必需
LLM_PROVIDER=tongyi
TONGYI_API_KEY=sk-xxxxxxxxxxxxxx

# 可选
PORT=3002
NODE_ENV=production
RATE_LIMIT_PER_MINUTE=6
CACHE_TTL=600
```

### 4.3 CORS 配置

后端需要允许 EdgeOne 域名的跨域请求：

```javascript
// backend/src/server.js
app.use(cors({
  origin: [
    'https://your-edgeone-domain.com',
    'http://localhost:5174'  // 开发环境
  ]
}));
```

## 五、域名与 HTTPS

### 5.1 配置自定义域名

1. 在 EdgeOne 控制台添加域名
2. 按提示配置 DNS（CNAME 解析）
3. 等待生效（通常几分钟）

### 5.2 HTTPS 证书

EdgeOne 自动提供免费 HTTPS 证书，无需额外配置。

## 六、部署检查清单

部署前检查：

- [ ] Web 构建成功（`npm run build`）
- [ ] 所有依赖已安装
- [ ] API 地址正确配置
- [ ] 环境变量已设置
- [ ] CORS 配置正确

部署后验证：

- [ ] 网站可访问
- [ ] API 调用正常
- [ ] 生成功能正常
- [ ] 复制功能正常
- [ ] 性能可接受（<3s 响应）

## 七、性能优化

### 7.1 EdgeOne 配置

- ✅ 启用 CDN 加速
- ✅ 启用 Brotli/Gzip 压缩
- ✅ 配置缓存规则
- ✅ 启用 HTTP/2

### 7.2 前端优化

```bash
# 压缩图片资源
npm install -D imagemin

# 代码分割（已由 Vite 自动处理）
```

### 7.3 后端优化

- ✅ 已实现缓存（TTL 10分钟）
- ✅ 已实现限流（6次/分钟）
- ⏳ 考虑使用 Redis（如流量大）

## 八、监控与运维

### 8.1 EdgeOne 监控

在控制台查看：
- 请求量
- 流量统计
- 错误率
- 响应时间

### 8.2 后端监控

建议配置：
- 日志收集（CloudWatch/腾讯云日志）
- 告警规则（错误率 > 5%）
- 性能监控（响应时间 > 3s）

### 8.3 成本监控

- EdgeOne 流量费用
- Serverless 调用次数
- LLM API 调用费用

## 九、常见问题

### Q1: API 调用失败（CORS 错误）
**A**: 检查后端 CORS 配置，确保允许 EdgeOne 域名。

### Q2: 构建后页面空白
**A**: 检查控制台错误，可能是路径配置问题。Vite 需要配置 `base` 路径。

### Q3: 部署后 API 无响应
**A**: 检查后端服务是否正常运行，环境变量是否配置正确。

### Q4: 缓存未生效
**A**: EdgeOne 和后端缓存是两层。确保两层都正确配置。

## 十、后续优化

- [ ] 配置 CDN 智能加速
- [ ] 启用 EdgeOne 边缘函数（可选）
- [ ] 实现后端日志聚合
- [ ] 配置告警规则
- [ ] A/B 测试不同 LLM 模型

## 参考资源

- EdgeOne 官方文档：https://cloud.tencent.com/document/product/1552
- Vite 部署文档：https://vitejs.dev/guide/static-deploy.html
- 腾讯云 Serverless：https://cloud.tencent.com/product/scf

---

**部署时间**: 2025-12-17  
**版本**: V1.0  
**维护人**: Ethan Chang

