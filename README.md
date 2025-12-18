# 真心话/大冒险 LLM 生成器

基于 LLM 的真心话/大冒险题目生成器，支持 Web 端和微信小程序。

## 项目简介

这是一个聚会互动游戏工具，通过 AI 大语言模型动态生成真心话或大冒险题目。支持多种风格（正常、暧昧、搞笑、职场等），并内置内容安全过滤机制。

## 技术栈

### 前端
- **Web**: React + Vite + Tailwind CSS
- **小程序**: 微信小程序原生框架

### 后端（EdgeOne Edge Functions）
- **LLM**: 通义千问 / DeepSeek（OpenAI 兼容接口）
- **缓存**: 边缘函数内存缓存（TTL 10分钟）
- **内容过滤**: 自定义敏感词过滤

### 部署架构
- **EdgeOne Pages**: 静态资源托管 + 边缘函数
- **无需服务器**: 所有逻辑在边缘节点执行

## 快速开始

### 1. 环境准备

确保已安装：
- Node.js >= 16
- npm >= 8

### 2. 克隆项目

```bash
git clone https://github.com/ethanchangrs-droid/truthordare.git
cd truthordare
```

### 3. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，填写必要的 API Key：

```bash
# 选择 LLM 供应商
LLM_PROVIDER=tongyi  # 或 deepseek

# 通义千问配置
TONGYI_API_KEY=sk-xxxxxxxxxxxxxx

# DeepSeek 配置（可选）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxx
```

### 4. 启动后端服务

```bash
cd backend
npm install
npm run dev
```

后端服务将在 `http://localhost:3002` 启动。

### 5. 启动 Web 前端

```bash
cd web
npm install
npm run dev
```

Web 应用将在 `http://localhost:5174` 启动。

### 6. 小程序开发

1. 在微信开发者工具中打开 `miniprogram` 目录
2. 配置小程序 AppID
3. 确保后端服务已启动
4. 在开发者工具中编译运行

## 项目结构

```
TruthorDare/
├── shared/               # 公共模块（单一真实源）
│   ├── llm/
│   │   └── parser.js            # LLM响应解析器（统一处理）
│   ├── prompt/
│   │   ├── builder.js           # Prompt构建逻辑
│   │   └── dimensions.js        # 话题维度定义
│   └── config/
│       └── llm-params.js        # LLM参数配置
├── functions/            # EdgeOne 边缘函数
│   └── api/
│       ├── generate-source.js   # 源码（引用shared/）
│       └── generate.js          # 打包后部署版本
├── web/                  # Web 前端
│   └── src/
│       ├── App.jsx              # 主组件
│       └── main.jsx             # 入口文件
├── miniprogram/          # 微信小程序
│   ├── pages/
│   │   └── index/               # 主页面
│   └── config/
│       └── index.js             # 配置文件
├── backend/              # 后端服务（本地开发用）
│   ├── src/
│   │   ├── server.js            # 入口文件
│   │   ├── services/            # LLM 服务（引用shared/）
│   │   └── utils/               # 工具函数
│   └── .env.example             # 环境变量模板
├── docs/                 # 项目文档
│   ├── PRD_TruthOrDare_V1.4_202512181524.md    # 产品需求文档
│   ├── SPEC_TruthOrDare_V1.4_202512181524.md   # 技术设计文档
│   └── archive/                 # 历史版本归档
├── log/                  # 开发日志
├── scripts/
│   └── bundle-functions.js      # 边缘函数打包脚本
├── pages.json            # EdgeOne Pages 配置
├── feature_list.json     # 功能清单
└── claude-progress.txt   # 开发进度
```

## API 接口

### POST /api/generate

生成真心话/大冒险题目。

**请求参数**:

```json
{
  "mode": "truth",           // truth 或 dare
  "style": "正常",            // 风格（12种可选）
  "locale": "zh-CN",         // 语言
  "count": 1,                // 数量（固定为1）
  "audienceAge": "adult",    // 受众年龄：kids/teen/adult
  "intensity": "medium",     // 尺度：soft/medium/hard
  "seed": 123                // 随机数种子（1-1000）
}
```

**响应示例**:

```json
{
  "items": [
    {
      "id": "gen-1234567890-0",
      "type": "truth",
      "text": "你最尴尬的一次经历是什么？"
    }
  ],
  "meta": {
    "provider": "deepseek",
    "promptId": "prompt-002",
    "latencyMs": 1250,
    "filteredCount": 0,
    "cached": false,
    "seed": 123
  }
}
```

## 功能特性

- ✅ 多种模式：真心话 / 大冒险
- ✅ 12 种风格：正常、暧昧、搞笑、职场、酒局、家庭、烧脑、极限、少儿适宜、派对、温情、大尺度（18+）
- ✅ 内容安全：自动过滤不当内容
- ✅ 限流保护：防止滥用
- ✅ 智能缓存：提升响应速度，降低成本
- ✅ 公共模块：统一核心逻辑，降低维护成本
- ✅ 跨平台：Web + 微信小程序

## 架构特点

### 公共模块设计（V1.4）

项目采用 `shared/` 目录统一管理核心逻辑，实现代码复用：

| 模块 | 功能 | 复用情况 |
|------|------|----------|
| `shared/llm/parser.js` | LLM响应解析 | 后端服务 + EdgeOne函数 |
| `shared/prompt/builder.js` | Prompt构建 | 后端服务 + EdgeOne函数 |
| `shared/prompt/dimensions.js` | 话题维度定义 | 后端服务 + EdgeOne函数 |
| `shared/config/llm-params.js` | LLM参数配置 | 后端服务 + EdgeOne函数 |

**架构优势**：
- ✅ 消除代码重复，单一真实源
- ✅ Bug修复自动同步到所有环境
- ✅ 降低 50% 维护成本
- ✅ 提升代码质量和可测试性

## 部署

### EdgeOne Pages 一键部署（推荐）

本项目使用 **EdgeOne Pages + Edge Functions** 架构，**无需单独部署后端服务器**。

1. 在 EdgeOne 控制台创建 Pages 项目，连接 GitHub 仓库

2. 配置构建参数：
   - 构建命令：`cd web && npm install && npm run build`
   - 输出目录：`web/dist`

3. 配置环境变量：
   ```
   LLM_PROVIDER=tongyi
   TONGYI_API_KEY=sk-xxxxxxxxxxxxxx
   ```

4. 点击部署，完成！

详细部署指南：[DEPLOY_EDGEONE.md](./DEPLOY_EDGEONE.md)

## 开发进度

当前完成度：**40.0%** (10/25)

查看详细进度：
- `feature_list.json` - 功能清单
- `claude-progress.txt` - 开发日志
- `docs/` - 产品需求和技术设计文档（最新：V1.4）
- `log/` - 开发日志和问题复盘

## License

MIT

## 联系方式

- GitHub: https://github.com/ethanchangrs-droid/truthordare
- Issues: https://github.com/ethanchangrs-droid/truthordare/issues

---

**免责声明**: 本工具生成内容仅供娱乐参考，不代表任何立场。请理性使用，遵守法律法规。

