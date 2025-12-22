import { test, expect } from '@playwright/test';

test.describe('真心话大冒险应用测试', () => {
  test.beforeEach(async ({ page }) => {
    // 访问应用
    await page.goto('http://localhost:5175');
  });

  test('应该能够生成大冒险题目', async ({ page }) => {
    // 选择大冒险模式
    await page.click('button:has-text("大冒险")');
    
    // 选择搞笑风格
    await page.click('button:has-text("搞笑")');
    
    // 点击生成题目
    await page.click('button:has-text("生成题目")');
    
    // 等待结果出现
    await page.waitForSelector('div:has-text("⚡ 大冒险")');
    
    // 验证结果存在
    const result = await page.textContent('div:has-text("⚡ 大冒险") + div');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('应该能够生成真心话题目', async ({ page }) => {
    // 选择真心话模式
    await page.click('button:has-text("真心话")');
    
    // 选择温情风格
    await page.click('button:has-text("温情")');
    
    // 点击生成题目
    await page.click('button:has-text("生成题目")');
    
    // 等待结果出现
    await page.waitForSelector('div:has-text("❓ 真心话")');
    
    // 验证结果存在
    const result = await page.textContent('div:has-text("❓ 真心话") + div');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  test('应该能够切换不同的风格', async ({ page }) => {
    // 检查所有风格按钮是否存在
    const styles = ['正常', '暧昧', '搞笑', '社牛', '职场', '酒局', '家庭', '烧脑', '少儿适宜', '派对', '温情', '大尺度'];
    
    for (const style of styles) {
      const button = await page.$(`button:has-text("${style}")`);
      expect(button).toBeTruthy();
    }
  });

  test('应该能够切换模式', async ({ page }) => {
    // 检查模式按钮
    const truthButton = await page.$('button:has-text("真心话")');
    const dareButton = await page.$('button:has-text("大冒险")');
    
    expect(truthButton).toBeTruthy();
    expect(dareButton).toBeTruthy();
  });
});