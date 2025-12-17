 Page({
  data: {
    mode: '', // truth | dare
    style: '', // 风格枚举
    styles: ['正常', '暧昧', '搞笑', '职场', '酒局', '家庭', '烧脑', '极限', '少儿'],
    result: null,
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

    // TODO: 调用后端接口
    setTimeout(() => {
      this.setData({
        result: `[Mock] 请执行一项${this.data.mode === 'truth' ? '真心话' : '大冒险'}任务（风格：${this.data.style}）`,
        loading: false
      });
    }, 500);
  },

  copyResult() {
    if (this.data.result) {
      wx.setClipboardData({ data: this.data.result });
    }
  }
});