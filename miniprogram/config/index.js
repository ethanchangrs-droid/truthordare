/**
 * 小程序配置文件
 * 根据环境切换不同的 API 地址
 */

// 开发环境配置
const devConfig = {
  apiBaseUrl: 'http://localhost:3002',
};

// 生产环境配置
const prodConfig = {
  apiBaseUrl: 'https://your-production-domain.com', // TODO: 部署后替换为实际域名
};

// 根据小程序的 envVersion 判断环境
// develop: 开发版, trial: 体验版, release: 正式版
const getConfig = () => {
  const accountInfo = wx.getAccountInfoSync();
  const envVersion = accountInfo?.miniProgram?.envVersion || 'develop';
  
  if (envVersion === 'release') {
    return prodConfig;
  }
  return devConfig;
};

const config = getConfig();

export default config;

