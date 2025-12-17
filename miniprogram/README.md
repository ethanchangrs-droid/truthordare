# 微信小程序 - MiniProgram

真心话/大冒险 LLM 生成器的微信小程序端。

## 技术栈

- **框架**: 微信小程序原生框架
- **语言**: JavaScript (ES6+)
- **样式**: WXSS
- **数据绑定**: 双向绑定
- **网络**: wx.request API

## 项目结构

```
miniprogram/
├── app.js                    # 小程序全局逻辑
├── app.json                  # 全局配置（页面路径、窗口样式）
├── sitemap.json              # 搜索索引配置
├── config/
│   └── index.js              # 环境配置（API 地址）
├── pages/
│   └── index/                # 首页
│       ├── index.js          # 页面逻辑
│       ├── index.json        # 页面配置
│       ├── index.wxml        # 页面结构
│       └── index.wxss        # 页面样式
├── components/               # 自定义组件（待添加）
├── utils/                    # 工具函数
├── services/                 # API 调用封装
└── README.md                 # 本文档
```

## 快速开始

### 1. 安装微信开发者工具

下载并安装：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html

### 2. 导入项目

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 填写 AppID（测试号或正式 AppID）

### 3. 配置后端地址

编辑 `config/index.js`：

```javascript
const devConfig = {
  apiBaseUrl: 'http://localhost:3002',  // 开发环境
};

const prodConfig = {
  apiBaseUrl: 'https://your-production-domain.com',  // 生产环境
};
```

### 4. 启动后端服务

确保后端服务在对应端口运行。开发环境需要：

```bash
cd backend
npm run dev  # 运行在 3002 端口
```

### 5. 编译运行

在微信开发者工具中点击"编译"按钮。

## 功能特性

### 已实现

- ✅ 模式选择（真心话/大冒险）
- ✅ 风格选择（11 种风格）
- ✅ 生成按钮与 API 调用
- ✅ 结果展示列表
- ✅ 复制功能（wx.setClipboardData）
- ✅ 加载状态
- ✅ 派对风格 UI（紫色/橙色配色）
- ✅ 环境自动判断（开发/生产）

### 待实现

- ⏳ 真机测试（FEAT-002）
- ⏳ 分享功能
- ⏳ 历史记录
- ⏳ 组件化（ModeSelector、StyleChip）

## 开发指南

### 页面配置

`index.json` 配置页面属性：

```json
{
  "navigationBarTitleText": "真心话大冒险",
  "enablePullDownRefresh": false,
  "usingComponents": {}
}
```

### 数据绑定

在 WXML 中使用数据绑定：

```xml
<view class="mode-btn {{mode === 'truth' ? 'active-truth' : ''}}" 
      data-mode="truth" 
      bindtap="selectMode">
  真心话
</view>
```

在 JS 中更新数据：

```javascript
Page({
  data: {
    mode: 'truth',
  },
  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode });
  },
});
```

### API 调用

使用 wx.request 调用后端接口：

```javascript
wx.request({
  url: `${config.apiBaseUrl}/api/generate`,
  method: 'POST',
  data: {
    mode: this.data.mode,
    style: this.data.style,
    count: 5,
  },
  success: (res) => {
    if (res.statusCode === 200) {
      this.setData({
        results: res.data.items,
      });
    }
  },
  fail: (err) => {
    wx.showToast({
      title: '生成失败',
      icon: 'none',
    });
  },
});
```

### 复制功能

```javascript
wx.setClipboardData({
  data: text,
  success: () => {
    wx.showToast({
      title: '已复制',
      icon: 'success',
    });
  },
});
```

### 环境判断

自动根据小程序环境加载配置：

```javascript
const getConfig = () => {
  const accountInfo = wx.getAccountInfoSync();
  const envVersion = accountInfo?.miniProgram?.envVersion || 'develop';
  
  if (envVersion === 'release') {
    return prodConfig;  // 正式版
  }
  return devConfig;  // 开发版/体验版
};
```

## 样式规范

### 颜色主题

```css
/* 主色 */
.primary-color {
  color: #9333EA;  /* 紫色 */
}

/* 辅助色 */
.secondary-color {
  color: #F97316;  /* 橙色 */
}
```

### 布局规范

- 使用 Flexbox 进行布局
- 单位使用 rpx（响应式像素）
- 间距：16rpx、32rpx、48rpx
- 圆角：16rpx

## 配置说明

### 域名白名单

在微信公众平台配置服务器域名：

1. 登录微信公众平台
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 配置"服务器域名"：
   - request 合法域名：`https://your-backend-api.com`

**注意**: 本地开发需要：
- 勾选"不校验合法域名"
- 或使用真机调试

### AppID 配置

在 `project.config.json` 中配置：

```json
{
  "appid": "your-app-id",
  "projectname": "truthordare"
}
```

## 测试

### 开发者工具测试

1. 在微信开发者工具中测试基本功能
2. 检查网络请求是否正常
3. 测试各种交互场景

### 真机测试

1. 点击"预览"，扫码在手机上测试
2. 测试网络请求（需配置合法域名）
3. 测试性能与用户体验

### 体验版测试

1. 上传代码为体验版
2. 设置体验者
3. 扫码体验

## 发布流程

### 1. 代码检查

- [ ] 确保所有功能正常
- [ ] 清理 console.log
- [ ] 检查网络请求域名

### 2. 上传代码

1. 点击"上传"
2. 填写版本号和项目备注
3. 上传到微信后台

### 3. 提交审核

1. 登录微信公众平台
2. 进入"版本管理"
3. 提交审核，填写审核信息

### 4. 发布

审核通过后，点击"发布"。

## 常见问题

**Q: API 调用失败（域名不合法）？**  
A: 开发环境勾选"不校验合法域名"；生产环境需在公众平台配置域名白名单。

**Q: 真机测试无法访问本地后端？**  
A: 本地后端需要在同一局域网，或部署到公网可访问的地址。

**Q: 样式在真机上显示异常？**  
A: 检查是否使用了 rpx 单位，避免使用 px。

**Q: 如何调试？**  
A: 使用 console.log 或开发者工具的调试器，真机可使用 vConsole。

## 性能优化

- [ ] 图片使用 CDN
- [ ] 列表使用虚拟滚动
- [ ] 避免频繁 setData
- [ ] 使用分包加载（如需要）

## 相关文档

- [项目总体 README](../README.md)
- [后端 README](../backend/README.md)
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

## License

MIT