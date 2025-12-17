# Web 前端说明

## 项目结构
- `src/`
  - `main.js`：入口文件
  - `App.jsx`：根组件
  - `pages/`：页面组件（如首页）
  - `components/`：通用组件（如 ModeSelector、StyleChip）
  - `services/`：API 调用封装
  - `utils/`：工具函数
  - `assets/`：静态资源（如图标、字体）

## 开发与运行
- 安装依赖：`npm install`
- 启动开发服务器：`npm run dev`
- 构建生产版本：`npm run build`

## 技术栈
- React（函数组件 + Hooks）
- Tailwind CSS（派对风格 UI）
- Vite（构建工具）

## 环境变量
- `.env` 文件中配置：
  - `VITE_API_BASE_URL`：后端接口地址（如 `http://localhost:3000/api`）