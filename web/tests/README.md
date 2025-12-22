# 测试文档

## 浏览器自动化测试

本项目使用Playwright进行端到端测试。

### 安装

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### 运行测试

```bash
# 运行所有测试
npm test

# 使用UI模式运行测试
npm run test:ui
```

### 测试内容

1. 验证应用可以生成大冒险题目
2. 验证应用可以生成真心话题目
3. 验证所有风格选项都存在
4. 验证模式切换功能

### 测试环境

测试会在本地开发服务器上运行，确保在运行测试前启动开发服务器：

```bash
npm run dev
```