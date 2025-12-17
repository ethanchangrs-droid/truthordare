#!/usr/bin/env bash
set -euo pipefail

echo "[Init] 开始初始化项目环境"
echo "[Init] 工作目录: $(pwd)"

echo "[Init] 检查必要工具"
command -v node >/dev/null 2>&1 && echo "Node: $(node -v)" || echo "[WARN] 未检测到 Node"
command -v npm >/dev/null 2>&1 && echo "npm: $(npm -v)" || echo "[WARN] 未检测到 npm"

echo "[Init] 创建基础目录"
mkdir -p docs

echo "[Init] 初始化完成"
