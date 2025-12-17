# GitHub 推送指令

## 当前状态

- ✅ Git 远程仓库已配置：https://github.com/ethanchangrs-droid/truthordare.git
- ✅ 本地分支：main
- ✅ 所有代码已提交，工作区干净

## 推送方法（三选一）

### 方法 1：使用 Personal Access Token（推荐）

1. 创建 GitHub Personal Access Token：
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token (classic)"
   - 勾选 `repo` 权限
   - 点击生成，复制 token

2. 执行推送：
```bash
cd /Users/david/Desktop/pitem/TruthorDare
git push https://YOUR_TOKEN@github.com/ethanchangrs-droid/truthordare.git main
```

### 方法 2：使用 SSH

1. 生成 SSH Key（如未配置）：
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

2. 添加到 GitHub：
   - 访问：https://github.com/settings/keys
   - 添加新的 SSH Key

3. 修改远程地址并推送：
```bash
cd /Users/david/Desktop/pitem/TruthorDare
git remote set-url origin git@github.com:ethanchangrs-droid/truthordare.git
git push -u origin main
```

### 方法 3：使用 GitHub CLI

```bash
# 安装 GitHub CLI（如未安装）
brew install gh

# 登录
gh auth login

# 推送
cd /Users/david/Desktop/pitem/TruthorDare
git push origin main
```

## 验证推送成功

访问 https://github.com/ethanchangrs-droid/truthordare 查看代码。

## 当前提交

```
b142794 docs: 添加项目 README 文档
f965cc4 chore: 更新 .gitignore，忽略 docs 和 log 文件夹
392259a feat: 将环境变量配置优化项加入任务清单
```

共 30+ 次提交，包含完整的项目代码和文档。
