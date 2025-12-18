# LLM 集成开发规范补充

## 文档信息

| 属性 | 内容 |
|------|------|
| 创建时间 | 2025-12-18 15:04 |
| 适用范围 | 所有涉及 LLM API 集成的项目 |
| 版本 | V1.0 |

---

## 一、LLM 输出处理规范

### 1.1 核心原则

> ⚠️ **永远不要假设 LLM 输出 100% 符合预期格式**

**必须遵守的原则**:
1. ✅ **多层容错**: JSON.parse → 手动提取 → 明确错误
2. ✅ **字符编码鲁棒性**: 同时支持中英文标点符号
3. ✅ **保留原始响应**: 用于调试和问题排查
4. ✅ **详细错误日志**: 记录解析失败的原始内容

### 1.2 JSON 解析标准模式

```javascript
function parseLLMResponse(rawText) {
  try {
    // 第1步：保留原始响应（前500字符）
    console.log('[LLM] 原始响应:', rawText.substring(0, 500));
    
    // 第2步：预处理（移除常见包裹）
    let jsonString = rawText.trim();
    jsonString = jsonString.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    jsonString = jsonString.replace(/^\s*\{\s*\[/, '[').replace(/\]\s*\}\s*$/, ']');
    
    // 第3步：尝试标准 JSON.parse
    try {
      const result = JSON.parse(jsonString);
      console.log('[LLM] JSON.parse 成功');
      return result;
    } catch (parseError) {
      console.warn('[LLM] JSON.parse 失败，尝试手动提取:', parseError.message);
    }
    
    // 第4步：手动提取（兜底）
    // 使用字符类同时匹配中英文引号
    const fieldMatch = jsonString.match(/["\u201C\u201D]fieldName["\u201C\u201D]\s*:\s*["\u201C\u201D]/);
    if (!fieldMatch) {
      throw new Error('无法提取关键字段，原始响应: ' + rawText.substring(0, 200));
    }
    
    // 提取字段值...
    console.log('[LLM] 手动提取成功');
    return extractedResult;
    
  } catch (err) {
    // 第5步：明确的错误处理
    console.error('[LLM] 解析失败:', err.message);
    console.error('[LLM] 原始响应:', rawText);
    throw new Error(`LLM响应解析失败: ${err.message}`);
  }
}
```

### 1.3 字符编码处理规范

**必须支持的引号类型**:

| 字符 | Unicode | 用途 | 必须支持 |
|------|---------|------|----------|
| `"` | U+0022 | 英文引号 | ✅ |
| `"` | U+201C | 中文左引号 | ✅ |
| `"` | U+201D | 中文右引号 | ✅ |
| `'` | U+0027 | 英文单引号 | 推荐 |
| `'` | U+2018 | 中文左单引号 | 推荐 |
| `'` | U+2019 | 中文右单引号 | 推荐 |

**正则表达式写法**:
```javascript
// ✅ 正确：使用 Unicode 转义
/["\u201C\u201D]/

// ✅ 正确：使用字符类
/["""]/  // 注意：需要在源码中直接包含中文引号

// ❌ 错误：只匹配英文引号
/"/
```

**预处理标准化（可选）**:
```javascript
function normalizeQuotes(str) {
  return str
    .replace(/[""]/g, '"')  // 中文双引号 → 英文双引号
    .replace(/['']/g, "'"); // 中文单引号 → 英文单引号
}
```

### 1.4 Prompt 优化建议

**在 system prompt 中明确要求**:
```javascript
const systemPrompt = `
你是一个专业的内容生成助手。

输出格式要求：
1. 必须返回有效的 JSON 格式
2. JSON 必须使用英文双引号 (")，不要使用中文引号 ("")
3. 不要在 JSON 外添加任何说明文字
4. 不要使用 Markdown 代码块包裹

正确示例：
[{"type": "truth", "text": "这是内容"}]

错误示例：
[{"type": "truth", "text": "这是内容"}]  ❌ 使用了中文引号
\`\`\`json [{"type": "truth", "text": "..."}] \`\`\`  ❌ 使用了代码块
`;
```

---

## 二、LLM 集成测试规范

### 2.1 测试充分性要求

**必须满足的测试标准**:
- ✅ 本地单元测试：覆盖 ≥10 种异常格式
- ✅ 本地循环测试：≥30 次连续请求
- ✅ 线上验证测试：≥50 次真实 API 调用
- ✅ 边缘情况测试：中文引号、特殊字符、超长文本

### 2.2 循环测试脚本模板

```bash
#!/bin/bash
# LLM API 稳定性测试脚本

API_URL="https://your-api.com/generate"
TEST_COUNT=50
ERROR_LOG="llm_test_errors.log"

echo "开始测试 LLM API (共 $TEST_COUNT 次)..."
echo "" > "$ERROR_LOG"

SUCCESS=0
FAIL=0

for i in $(seq 1 $TEST_COUNT); do
  result=$(curl -s -X POST "$API_URL" \
    -H 'Content-Type: application/json' \
    -d "{\"param\":\"value\",\"seed\":$((RANDOM))}")
  
  if echo "$result" | grep -q '"error"'; then
    ((FAIL++))
    echo "测试 $i: ❌ 失败" | tee -a "$ERROR_LOG"
    echo "$result" >> "$ERROR_LOG"
    echo "" >> "$ERROR_LOG"
  else
    ((SUCCESS++))
    printf "."
  fi
  
  sleep 0.2
done

echo ""
echo "=== 测试完成 ==="
echo "成功: $SUCCESS / $TEST_COUNT"
echo "失败: $FAIL / $TEST_COUNT"
echo "成功率: $(echo "scale=2; $SUCCESS * 100 / $TEST_COUNT" | bc)%"

if [ $FAIL -gt 0 ]; then
  echo "错误日志已保存到: $ERROR_LOG"
  exit 1
fi
```

### 2.3 单元测试用例清单

**必须覆盖的测试场景**:

```javascript
describe('parseLLMResponse', () => {
  // 1. 标准格式
  it('should parse standard JSON', () => {
    const input = '[{"type":"truth","text":"content"}]';
    expect(parseResponse(input)).toBeDefined();
  });
  
  // 2. 中文引号
  it('should handle Chinese quotation marks', () => {
    const input = '[{"type":"truth","text":"内容"}]';
    expect(parseResponse(input)).toBeDefined();
  });
  
  // 3. Markdown 包裹
  it('should handle Markdown code blocks', () => {
    const input = '```json\n[{"type":"truth","text":"content"}]\n```';
    expect(parseResponse(input)).toBeDefined();
  });
  
  // 4. 异常包裹
  it('should handle wrapped JSON', () => {
    const input = '{[{"type":"truth","text":"content"}]}';
    expect(parseResponse(input)).toBeDefined();
  });
  
  // 5. 转义字符
  it('should handle escaped characters', () => {
    const input = '[{"type":"truth","text":"line1\\nline2"}]';
    expect(parseResponse(input).text).toContain('\n');
  });
  
  // 6. 特殊字符
  it('should handle special characters in content', () => {
    const input = '[{"type":"truth","text":"包含\\"引号\\"的内容"}]';
    expect(parseResponse(input)).toBeDefined();
  });
  
  // 7. 超长文本
  it('should handle long text', () => {
    const longText = 'a'.repeat(1000);
    const input = `[{"type":"truth","text":"${longText}"}]`;
    expect(parseResponse(input).text.length).toBe(1000);
  });
  
  // 8. 空内容
  it('should reject empty content', () => {
    const input = '[{"type":"truth","text":""}]';
    expect(() => parseResponse(input)).toThrow();
  });
  
  // 9. 缺失字段
  it('should reject missing required fields', () => {
    const input = '[{"type":"truth"}]';
    expect(() => parseResponse(input)).toThrow();
  });
  
  // 10. 无效类型
  it('should reject invalid type', () => {
    const input = '[{"type":"invalid","text":"content"}]';
    expect(() => parseResponse(input)).toThrow();
  });
});
```

---

## 三、Bug 修复流程规范

### 3.1 问题诊断流程

**标准流程（6步法）**:

```
1. 复现问题
   ├─ 用户报告现象
   ├─ 尝试在本地/线上复现
   └─ 使用循环测试提高复现概率
   
2. 保留现场
   ├─ 捕获原始输入/输出
   ├─ 记录错误堆栈
   └─ 保存相关日志
   
3. 定位根因
   ├─ 分析错误信息
   ├─ 对比正常/异常情况
   └─ 识别差异点
   
4. 设计修复方案
   ├─ 考虑多种方案
   ├─ 评估副作用
   └─ 选择最优方案
   
5. 实施修复
   ├─ 编写修复代码
   ├─ 添加注释说明
   └─ 准备回退方案
   
6. 验证效果
   ├─ 单元测试
   ├─ 循环测试（≥30次）
   └─ 线上灰度验证
```

### 3.2 修复前检查清单

**必须完成的检查项**:
- [ ] 问题是否已复现？（如未复现，禁止修复）
- [ ] 是否理解了根本原因？（如不理解，继续诊断）
- [ ] 是否考虑了边缘情况？（中文引号、特殊字符等）
- [ ] 是否评估了副作用？（会不会影响正常场景）
- [ ] 是否有回退方案？（git revert 或 feature flag）

### 3.3 修复后验证清单

**必须完成的验证项**:
- [ ] 本地单元测试通过
- [ ] 本地循环测试通过（≥30次）
- [ ] 线上真实 API 测试通过（≥50次）
- [ ] 监控指标正常（成功率、延迟）
- [ ] 文档已更新（进度日志、复盘报告）

### 3.4 禁止的修复模式

**❌ 禁止行为1：未复现就修复**
```
错误流程：
用户报告 → 猜测原因 → 直接修改代码 → 推送上线

正确流程：
用户报告 → 循环测试复现 → 定位根因 → 设计方案 → 实施 → 验证
```

**❌ 禁止行为2：过度假设**
```javascript
// ❌ 错误：假设 LLM 只会返回特定格式
if (response.startsWith('{[')) {
  // 只处理这一种情况
}

// ✅ 正确：使用通用的清理逻辑
response = response.trim()
  .replace(/```json\s*/gi, '')
  .replace(/^\s*\{\s*\[/, '[')
  .replace(/\]\s*\}\s*$/, ']');
```

**❌ 禁止行为3：破坏性修改**
```javascript
// ❌ 错误：可能误删内容中的合法字符
text = text.replace(/"\s*\}\s*\]?\s*$/, '');

// ✅ 正确：精确匹配结尾模式
text = text.replace(/["\u201C\u201D]\s*\}[\s\}\]]*$/, '');
```

**❌ 禁止行为4：测试不充分**
```bash
# ❌ 错误：只测试 3-5 次
for i in {1..5}; do test; done

# ✅ 正确：至少测试 30-50 次
for i in {1..50}; do test; done
```

---

## 四、错误处理规范

### 4.1 错误分类标准

**按严重程度分类**:

| 等级 | 名称 | 描述 | 处理方式 |
|------|------|------|----------|
| 🔴 P0 | 阻断性错误 | 核心功能不可用 | 立即修复 |
| 🟡 P1 | 严重错误 | 部分功能受影响 | 24小时内修复 |
| 🟢 P2 | 一般错误 | 用户体验受影响 | 1周内修复 |
| ⚪ P3 | 轻微问题 | 无明显影响 | 计划修复 |

**按来源分类**:

| 类型 | 示例 | 检测方式 |
|------|------|----------|
| 网络错误 | ETIMEDOUT, ECONNRESET | try-catch + error.code |
| LLM 错误 | API Key 无效, 频率超限 | HTTP status code |
| 解析错误 | JSON 格式错误, 字段缺失 | 解析异常 |
| 业务错误 | 敏感词过滤, 参数校验失败 | 自定义校验 |

### 4.2 错误日志规范

**必须记录的信息**:
```javascript
console.error('[ERROR] 详细信息', {
  timestamp: new Date().toISOString(),
  errorType: 'LLM_PARSE_ERROR',
  errorMessage: err.message,
  requestParams: { mode, style, seed },
  rawResponse: rawText.substring(0, 500),
  stackTrace: err.stack
});
```

**日志级别**:
- `console.log`: 正常流程信息
- `console.warn`: 降级处理（如 JSON.parse 失败但手动提取成功）
- `console.error`: 错误信息（需要人工介入）

### 4.3 用户友好的错误提示

```javascript
// ❌ 错误：技术性错误直接暴露给用户
return { error: 'JSON.parse failed at position 42' };

// ✅ 正确：友好的错误提示 + 技术详情（可选）
return {
  error: 'LLM 响应格式异常，请重试',
  code: 'LLM_PARSE_ERROR',
  details: isDevelopment ? err.message : undefined
};
```

---

## 五、代码审查清单

### 5.1 LLM 集成代码审查

**必须检查的项目**:
- [ ] 是否有多层容错（JSON.parse + 手动提取）？
- [ ] 是否支持中英文引号（Unicode 转义）？
- [ ] 是否保留了原始响应用于调试？
- [ ] 是否有详细的错误日志？
- [ ] 是否有超时控制（30秒）？
- [ ] 是否有重试机制（3次）？
- [ ] 是否有单元测试覆盖？
- [ ] 是否有循环测试验证（≥30次）？

### 5.2 正则表达式审查

**必须检查的项目**:
- [ ] 是否使用了字符类 `[...]` 而非单一字符？
- [ ] 是否使用了 Unicode 转义 `\u201C` 而非直接字符？
- [ ] 是否考虑了贪婪/非贪婪匹配？
- [ ] 是否会误匹配内容中的合法字符？
- [ ] 是否有注释说明正则的意图？

### 5.3 测试代码审查

**必须检查的项目**:
- [ ] 是否覆盖了中文引号场景？
- [ ] 是否覆盖了 Markdown 包裹场景？
- [ ] 是否覆盖了特殊字符场景？
- [ ] 是否覆盖了异常输入场景？
- [ ] 是否有循环测试（≥30次）？

---

## 六、文档规范

### 6.1 复盘报告必须包含的内容

**标准结构**:
1. 问题现象（用户视角）
2. 直接原因（技术视角）
3. 根本原因（深层分析）
4. 解决过程（时间线）
5. 解决方法（技术实现）
6. 经验教训（方法论）
7. 预防措施（长期改进）
8. 后续优化（行动计划）

### 6.2 进度日志必须记录的信息

**必须包含**:
- [ ] 问题现象（简述）
- [ ] 根本原因（一句话）
- [ ] 解决方案（技术要点）
- [ ] 文件变更清单
- [ ] Git 提交记录
- [ ] 测试验证结果

### 6.3 代码注释规范

**关键位置必须注释**:
```javascript
// ✅ 好的注释：说明"为什么"
// 注意：LLM 有时返回中文引号 " (U+201C) 和 " (U+201D)
// 必须同时匹配中英文引号，否则解析会失败
const quotePattern = /["\u201C\u201D]/;

// ❌ 坏的注释：只说明"是什么"
// 匹配引号
const quotePattern = /["\u201C\u201D]/;
```

---

## 七、持续改进

### 7.1 定期审查机制

**每月审查清单**:
- [ ] LLM API 成功率 ≥ 99%？
- [ ] 手动提取占比 < 20%？
- [ ] 平均响应时间 < 3秒？
- [ ] 新增边缘情况测试用例？
- [ ] Prompt 优化效果评估？

### 7.2 技术债务管理

**识别技术债务的信号**:
- 🚨 手动提取占比持续上升
- 🚨 相同类型错误反复出现
- 🚨 测试覆盖率下降
- 🚨 代码复杂度持续增加

**偿还技术债务的优先级**:
1. P0: 影响核心功能的债务（立即处理）
2. P1: 影响稳定性的债务（本月处理）
3. P2: 影响可维护性的债务（本季度处理）

### 7.3 知识沉淀

**必须沉淀的知识类型**:
- ✅ 复盘报告（每个 P0/P1 问题）
- ✅ 测试用例（每个边缘情况）
- ✅ 最佳实践（成功经验）
- ✅ 反面教材（失败教训）

---

## 八、快速参考

### 8.1 常见问题速查表

| 现象 | 可能原因 | 快速诊断 | 解决方案 |
|------|----------|----------|----------|
| "无法提取字段" | 中文引号 | 检查原始响应中的引号类型 | 使用 Unicode 转义匹配 |
| "JSON.parse 失败" | Markdown 包裹 | 检查是否有 \`\`\`json | 预处理移除代码块 |
| "内容被截断" | 正则误匹配 | 检查正则是否贪婪匹配 | 使用非贪婪匹配 |
| "偶发解析失败" | 测试不充分 | 循环测试 ≥30 次 | 扩大测试覆盖 |

### 8.2 Unicode 引号速查表

```javascript
// 完整的引号匹配模式
const DOUBLE_QUOTES = '["\u201C\u201D\u201E\u201F]';  // " " „ ‟
const SINGLE_QUOTES = "['\u2018\u2019\u201A\u201B]";  // ' ' ‚ ‛

// 常用组合
const ANY_QUOTE = /["'""'']/g;
```

### 8.3 测试命令速查

```bash
# 本地单元测试
npm test

# 循环测试（30次）
for i in {1..30}; do curl -X POST ...; sleep 0.2; done

# 线上验证（50次）
for i in {1..50}; do curl -X POST https://api.com/...; sleep 0.2; done

# 捕获错误
for i in {1..50}; do
  result=$(curl ...)
  if echo "$result" | grep -q '"error"'; then
    echo "$result"
    break
  fi
done
```

---

## 九、检查清单总览

### ✅ 开发阶段
- [ ] 实现了多层容错机制
- [ ] 支持中英文引号（Unicode 转义）
- [ ] 保留原始响应用于调试
- [ ] 添加了详细的代码注释
- [ ] 编写了单元测试（≥10个用例）

### ✅ 测试阶段
- [ ] 本地单元测试通过
- [ ] 本地循环测试通过（≥30次）
- [ ] 覆盖中文引号场景
- [ ] 覆盖 Markdown 包裹场景
- [ ] 覆盖异常输入场景

### ✅ 上线阶段
- [ ] 线上灰度测试通过（≥50次）
- [ ] 监控指标配置完成
- [ ] 告警规则设置完成
- [ ] 回退方案准备就绪

### ✅ 文档阶段
- [ ] 更新进度日志
- [ ] 编写复盘报告（P0/P1问题）
- [ ] 更新 README（如有新功能）
- [ ] 更新 API 文档（如有接口变更）

---

**规范版本**: V1.0  
**最后更新**: 2025-12-18 15:04  
**适用项目**: TruthOrDare 及所有 LLM 集成项目

