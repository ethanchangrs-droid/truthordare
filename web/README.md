# Web 前端 - Frontend

真心话/大冒险 LLM 生成器的 Web 前端应用。

## 技术栈

- **框架**: React 18
- **构建工具**: Vite
- **样式**: Tailwind CSS
- **状态管理**: React Hooks (useState)
- **HTTP 客户端**: Fetch API
- **开发服务器**: Vite Dev Server（支持 HMR）

## 项目结构

```
web/
├── src/
│   ├── main.jsx              # 应用入口，React 渲染
│   ├── App.jsx               # 根组件，主要业务逻辑
│   ├── index.css             # 全局样式，Tailwind 导入
│   ├── assets/               # 静态资源（图片、图标）
│   ├── components/           # 可复用组件（待拆分）
│   ├── pages/                # 页面组件
│   ├── services/             # API 调用封装
│   └── utils/                # 工具函数
├── index.html                # HTML 模板
├── vite.config.js            # Vite 配置（端口、代理）
├── tailwind.config.js        # Tailwind 配置
├── postcss.config.js         # PostCSS 配置
├── package.json              # 依赖配置
└── README.md                 # 本文档
```

## 快速开始

### 1. 安装依赖

```bash
cd web
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5174` 启动，支持热更新（HMR）。

### 3. 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接部署到静态托管服务。

### 4. 预览生产构建

```bash
npm run preview
```

## 功能特性

### 已实现

- ✅ 模式选择（真心话/大冒险）
- ✅ 风格选择（11 种风格）
- ✅ 生成按钮与 API 调用
- ✅ 结果展示列表
- ✅ 单条复制功能
- ✅ 复制全部功能
- ✅ 再来一题按钮
- ✅ 加载状态与错误处理
- ✅ 响应式布局
- ✅ 派对风格 UI（紫色/橙色配色）
- ✅ 底部免责声明

### 待实现

- ⏳ 组件拆分（FEAT-008）
- ⏳ 参数化 UI（count/age/intensity）（FEAT-007）
- ⏳ 收藏功能（FEAT-014, P3）
- ⏳ 多语言支持（FEAT-015, P3）

## 开发指南

### 代理配置

开发环境下，Vite 会将 `/api/*` 请求代理到后端服务：

```javascript
// vite.config.js
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:3002',  // 后端地址
      changeOrigin: true,
      secure: false,
    }
  }
}
```

确保后端服务在 `http://localhost:3002` 运行。

### 添加新组件

1. 在 `src/components/` 创建组件文件
2. 使用函数组件 + Hooks
3. 在 `App.jsx` 中引入使用

示例：

```jsx
// src/components/ModeSelector.jsx
export default function ModeSelector({ mode, onSelect }) {
  return (
    <div className="flex gap-4">
      <button
        onClick={() => onSelect('truth')}
        className={mode === 'truth' ? 'active' : ''}
      >
        真心话
      </button>
      <button
        onClick={() => onSelect('dare')}
        className={mode === 'dare' ? 'active' : ''}
      >
        大冒险
      </button>
    </div>
  );
}
```

### Tailwind CSS 使用

项目使用 Tailwind CSS 实用类：

```jsx
<div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 p-4">
  <h1 className="text-4xl font-bold text-purple-600">标题</h1>
  <button className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
    按钮
  </button>
</div>
```

### API 调用

使用 Fetch API 调用后端接口：

```javascript
const response = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mode: 'truth',
    style: '正常',
    count: 5,
  }),
});

const data = await response.json();
```

### 状态管理

当前使用 React Hooks 本地状态：

```javascript
const [mode, setMode] = useState('truth');
const [style, setStyle] = useState('正常');
const [results, setResults] = useState([]);
const [loading, setLoading] = useState(false);
```

## 构建与部署

### 构建优化

Vite 自动处理：
- ✅ 代码分割
- ✅ Tree Shaking
- ✅ 资源压缩
- ✅ CSS 提取

### 部署到 EdgeOne

1. 构建生产版本：
```bash
npm run build
```

2. 上传 `dist/` 目录到 EdgeOne 静态托管

3. 配置 SPA 路由规则（如需要）

详细步骤见项目根目录的 [DEPLOY_EDGEONE.md](../DEPLOY_EDGEONE.md)。

### 其他部署平台

- **Vercel**: 自动检测 Vite 项目
- **Netlify**: 构建命令 `npm run build`，发布目录 `dist`
- **GitHub Pages**: 需配置 `base` 路径

## 环境变量

### 开发环境

创建 `.env.development`:

```bash
VITE_PORT=5174
VITE_API_PROXY_TARGET=http://localhost:3002
```

### 生产环境

创建 `.env.production`:

```bash
VITE_API_BASE_URL=https://your-api-domain.com
```

**注意**: Vite 环境变量必须以 `VITE_` 开头才能暴露给客户端代码。

## 样式规范

### 颜色主题

```css
/* Tailwind 配置 */
{
  colors: {
    purple: '#9333EA',  /* 主色 */
    orange: '#F97316',  /* 辅助色 */
  }
}
```

### 布局规范

- 使用 Flexbox 进行布局
- 响应式设计（移动优先）
- 最小宽度：320px
- 最大内容宽度：1200px

## 常见问题

**Q: API 调用失败（CORS 错误）？**  
A: 确保后端 CORS 配置允许前端域名，或使用 Vite 代理。

**Q: 样式不生效？**  
A: 检查 Tailwind 配置，确保 `content` 路径包含所有组件文件。

**Q: 构建后页面空白？**  
A: 检查浏览器控制台错误，可能是路径配置问题。

**Q: 热更新不工作？**  
A: 重启开发服务器，检查文件是否在 `src/` 目录下。

## 性能优化建议

- [ ] 组件懒加载（React.lazy）
- [ ] 图片懒加载
- [ ] 使用 CDN 加载静态资源
- [ ] 启用 Gzip/Brotli 压缩
- [ ] 配置缓存策略

## 相关文档

- [项目总体 README](../README.md)
- [后端 README](../backend/README.md)
- [Vite 官方文档](https://vitejs.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

## License

MIT