import React, { useState } from 'react';

function App() {
  const [mode, setMode] = useState('truth');
  const [style, setStyle] = useState('正常');
  const [result, setResult] = useState(null); // 单条结果
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // const [copiedId, setCopiedId] = useState(null); // 复制成功提示 - 暂时禁用

  // 风格列表，新增"大尺度"
  const styles = ['正常', '暧昧', '搞笑', '职场', '酒局', '家庭', '烧脑', '极限', '少儿适宜', '派对', '温情', '大尺度'];

  const handleGenerate = async () => {
    // 防抖：生成过程中按钮点击无效
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    // 生成 1~1000 随机数，用于缓存命中逻辑（约0.1%命中率）
    const randomSeed = Math.floor(Math.random() * 1000) + 1;
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          style,
          count: 1, // 每次只生成一题
          locale: 'zh-CN',
          audienceAge: 'adult',
          intensity: style === '大尺度' ? 'hard' : 'medium', // 大尺度风格使用 hard 强度
          seed: randomSeed // 随机数种子，用于缓存
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // 只取第一条结果
        setResult(data.items?.[0] || null);
      } else {
        setError(data.error || '生成失败');
      }
    } catch (err) {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  // 复制单条内容到剪贴板 - 暂时禁用
  // const handleCopy = async (text, id) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     setCopiedId(id);
  //     setTimeout(() => setCopiedId(null), 2000);
  //   } catch (err) {
  //     console.error('复制失败:', err);
  //   }
  // };

  // 复制全部内容 - 暂时禁用
  // const handleCopyAll = async () => { ... };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-orange-50 p-4">
      <header className="text-center py-6">
        <h1 className="text-3xl font-bold text-purple-600">🎉 真心话 / 大冒险</h1>
        <p className="text-gray-600 mt-2">选择模式与风格，生成专属互动题目</p>
      </header>
      <main className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6 space-y-6">
        {/* Mode Selector */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800">🎮 模式选择</h2>
          <div className="flex gap-4 mt-2">
            <button 
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                mode === 'truth' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
              onClick={() => setMode('truth')}
            >
              真心话
            </button>
            <button 
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                mode === 'dare' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
              onClick={() => setMode('dare')}
            >
              大冒险
            </button>
          </div>
        </section>

        {/* Style Selector */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800">🎨 风格选择</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {styles.map((s) => (
              <button
                key={s}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  style === s
                    ? s === '大尺度' 
                      ? 'bg-red-600 text-white' // 大尺度用红色高亮
                      : 'bg-purple-600 text-white'
                    : s === '大尺度'
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setStyle(s)}
              >
                {s}
              </button>
            ))}
          </div>
          {/* 大尺度风格提示 */}
          {style === '大尺度' && (
            <p className="text-xs text-red-500 mt-2">⚠️ 此风格包含成人内容，仅限18岁以上用户</p>
          )}
        </section>

        {/* Generate Button */}
        <div className="flex gap-3">
          <button
            className={`flex-1 py-3 rounded-lg font-bold text-lg shadow transition ${
              loading 
                ? 'bg-gray-400 text-white cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '生成中...' : '生成题目'}
          </button>
          {/* 再来一题按钮 - 暂时禁用 */}
          {/* {result && (
            <button
              className="px-4 py-3 bg-orange-500 text-white rounded-lg font-bold shadow hover:bg-orange-600 transition disabled:opacity-50"
              onClick={handleGenerate}
              disabled={loading}
              title="再来一题"
            >
              🔄
            </button>
          )} */}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-center py-2">
            错误: {error}
          </div>
        )}

        {/* Result Display - 简化为单条显示 */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800">📋 生成结果</h2>
          {/* 复制全部按钮 - 暂时禁用 */}
          <div className="mt-2">
            {result ? (
              <div 
                className={`p-4 rounded-lg ${
                  result.type === 'truth' 
                    ? 'bg-purple-50 border border-purple-200' 
                    : 'bg-orange-50 border border-orange-200'
                }`}
              >
                <div className="font-medium text-gray-800 text-lg">
                  {result.type === 'truth' ? '❓ 真心话' : '⚡ 大冒险'}
                </div>
                <div className="mt-2 text-gray-700 text-lg">{result.text}</div>
                {/* 复制按钮 - 暂时禁用 */}
                {/* <button
                  className="mt-2 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                  onClick={() => handleCopy(result.text, result.id)}
                >
                  复制
                </button> */}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
                {loading ? '正在生成题目...' : '点击上方按钮生成题目'}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer - 免责声明与安全提示 */}
      <footer className="max-w-md mx-auto mt-6 px-4 pb-8 text-center text-xs text-gray-400">
        <p>🔒 我们会过滤不适宜内容，如有问题请反馈。</p>
        <p className="mt-1">本工具仅供娱乐，生成内容由 AI 提供，请自行判断适用性。</p>
      </footer>
    </div>
  );
}

export default App;
