import config from '../../config/index';

Page({
  data: {
    mode: '', // truth | dare
    style: '', // 风格枚举
    styles: ['正常', '暧昧', '搞笑', '职场', '酒局', '家庭', '烧脑', '极限', '少儿适宜', '派对', '温情'],
    result: null,
    resultType: null, // truth | dare
    loading: false
  },

  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode });
  },

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    this.setData({ style });
  },

  generate() {
    if (!this.data.mode || !this.data.style) {
      wx.showToast({ title: '请选择模式与风格', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    // 调用后端接口
    wx.request({
      url: `${config.apiBaseUrl}/api/generate`,
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        mode: this.data.mode,
        style: this.data.style,
        count: 1,
        locale: 'zh-CN',
        audienceAge: 'adult',
        intensity: 'medium'
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.items && res.data.items.length > 0) {
          // 显示第一个生成的结果
          const item = res.data.items[0];
          this.setData({
            result: item.text,
            resultType: item.type
          });
        } else {
          // 处理错误情况
          wx.showToast({ 
            title: res.data.error || '生成失败', 
            icon: 'none' 
          });
        }
      },
      fail: (err) => {
        console.error('API调用失败:', err);
        wx.showToast({ 
          title: '网络错误，请稍后再试', 
          icon: 'none' 
        });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  copyResult() {
    if (this.data.result) {
      wx.setClipboardData({ 
        data: this.data.result,
        success: () => {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  }
});