import React from 'react';

function App() {
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
            <button className="flex-1 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium">真心话</button>
            <button className="flex-1 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium">大冒险</button>
          </div>
        </section>

        {/* Style Selector */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800">🎨 风格选择</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {['正常', '暧昧', '搞笑', '职场', '酒局', '家庭', '烧脑', '极限', '少儿'].map((style) => (
              <button key={style} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {style}
              </button>
            ))}
          </div>
        </section>

        {/* Generate Button */}
        <button className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold text-lg shadow hover:bg-purple-700 transition">
          生成题目
        </button>

        {/* Result Placeholder */}
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800">📋 生成结果</h2>
          <div className="mt-2 text-gray-500 text-center py-8 border border-dashed border-gray-300 rounded-lg">
            点击上方按钮生成题目
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;