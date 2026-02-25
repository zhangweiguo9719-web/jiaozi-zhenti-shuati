# 纯静态网页刷题应用

这是一个**无需后端、无需构建工具**的刷题应用，支持：

- 套卷模式（上一题/下一题、实时判题、交卷统计）
- 专项练习（按年份、题型、关键字筛选 + 随机抽题）
- 本地持久化（作答记录、错题本、收藏）

## 文件结构

```text
.
├── index.html
├── styles.css
├── app.js
├── data
│   ├── questions.json
│   └── papers
│       └── paper_demo.json
└── README.md
```

## 本地运行

> 由于页面通过 `fetch` 读取 JSON，建议使用本地静态服务器，不要直接双击 `index.html`。

### 方式 1：Python

```bash
python3 -m http.server 8000
```

打开浏览器访问：<http://localhost:8000>

### 方式 2：Node（如已安装）

```bash
npx serve .
```

## 部署到 GitHub Pages

1. 将代码推送到 GitHub 仓库。
2. 进入仓库 **Settings -> Pages**。
3. 在 **Build and deployment** 中选择：
   - Source: `Deploy from a branch`
   - Branch: 选择 `main`（或你的发布分支）和 `/ (root)`
4. 保存后等待部署完成。
5. 访问 GitHub Pages 提供的链接即可。

## 数据字段说明

`data/questions.json` 每题字段：

- `id`: 题目唯一 ID
- `year`: 年份
- `subject`: 学科/分类
- `type`: 题型（当前为 `single`）
- `stem`: 题干
- `options`: 选项对象（A/B/C/D）
- `answer`: 正确答案（如 `"A"`）
- `analysis`: 解析
- `score`: 分值

`data/papers/paper_demo.json`：

- `id`: 套卷 ID
- `title`: 套卷名称
- `description`: 说明
- `questionIds`: 题目 ID 列表（引用 `questions.json` 中的 `id`）
