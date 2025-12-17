// test-api-connection.js
// 用于测试后端API连接的简单脚本

import('node-fetch').then(async ({ default: fetch }) => {
  const testApiConnection = async () => {
    try {
      console.log('正在测试后端API连接...');
      
      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'truth',
          style: 'party',
          count: 3,
          locale: 'zh-CN',
          audienceAge: 'adult',
          intensity: 'medium'
        }),
      });

      const data = await response.json();
      console.log('API响应状态:', response.status);
      console.log('API响应数据:', JSON.stringify(data, null, 2));
      
      if (response.ok) {
        console.log('✅ 后端API连接测试成功！');
      } else {
        console.log('❌ 后端API连接测试失败');
        if (data.code === 'LLM_CONFIG_ERROR') {
          console.log('ℹ️  这是预期的配置错误，因为尚未设置有效的API密钥');
        }
      }
    } catch (error) {
      console.error('测试过程中发生错误:', error.message);
    }
  };

  testApiConnection();
}).catch(err => {
  console.error('Failed to load node-fetch:', err);
});