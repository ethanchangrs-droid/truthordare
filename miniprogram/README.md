# 微信小程序说明

## 项目结构
- `app.js`：小程序全局逻辑
- `app.json`：全局配置（页面路径、窗口样式等）
- `sitemap.json`：索引配置
- `pages/`：页面目录
  - `index/`：首页
    - `index.js`：页面逻辑
    - `index.json`：页面配置
    - `index.wxml`：页面结构
    - `index.wxss`：页面样式

## 开发与调试
- 使用微信开发者工具打开项目根目录
- 页面逻辑与结构已实现基础交互（模式/风格选择、生成、复制）
- 样式采用派对风格配色（紫色为主，橙色为辅）

## 后续开发建议
- 实现 `index.js` 中的 `TODO`：调用后端 `/api/generate` 接口
- 补充更多页面（如历史记录、设置等）
- 添加组件复用（如 StyleChip、ModeButton）