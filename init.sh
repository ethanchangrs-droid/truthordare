#!/usr/bin/env bash
set -euo pipefail

echo "[Init] 开始初始化项目环境"
echo "[Init] 工作目录: $(pwd)"

echo "[Init] 检查必要工具"
command -v node >/dev/null 2>&1 && echo "Node: $(node -v)" || echo "[WARN] 未检测到 Node"
command -v npm >/dev/null 2>&1 && echo "npm: $(npm -v)" || echo "[WARN] 未检测到 npm"

echo "[Init] 创建基础目录"
mkdir -p docs

echo "[Init] 检查环境变量配置"
if [ ! -f backend/.env ]; then
  echo "[WARN] 未找到 backend/.env 文件"
  echo "[INFO] 请执行以下命令配置环境变量："
  echo "       cd backend && cp .env.example .env"
  echo "       然后编辑 .env 文件，填写必要的 API Key"
else
  echo "[OK] backend/.env 文件已存在"
fi

echo "[Init] 初始化完成"
echo ""
echo "下一步："
echo "1. 如果尚未配置环境变量，请参考上述提示"
echo "2. 安装依赖: cd backend && npm install"
echo "3. 启动后端: cd backend && npm run dev"
echo "4. 安装前端依赖: cd web && npm install"
echo "5. 启动前端: cd web && npm run dev"
