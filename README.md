# lte_z - Tech Notes & Projects

基于 Astro 构建的技术站点，提供软件项目展示、技术文章归档与开发实践记录。

🌐 **[访问技术站点](https://lte-z.github.io/)**

## 📖 概览

| 页面 | 内容 |
| :--- | :--- |
| Home | 开发者介绍、成长经历与交互展示 |
| Work | 人工维护的软件项目精选 |
| Blog | 按年份归档的中文、英文和日文技术文章 |

## 🚀 开发与构建

需要 Node.js `>=22.23.4 <23`、npm `>=9.6.5`，依赖由 `package-lock.json` 锁定。

```sh
npm ci
npm run dev
```

默认开发地址为 `http://127.0.0.1:4321/`。

| 命令 | 用途 |
| :--- | :--- |
| `npm run check` | Astro 与 TypeScript 检查 |
| `npm test` | 内容排序、日期、草稿与加载校验测试 |
| `npm run build` | 生成静态站点至 `dist/` |
| `npm run preview` | 预览已构建的正式内容，默认使用 4321 端口 |

端口被占用时以终端输出为准。空项目／文章集合产生的 Astro 提示属于正常状态。

### 部署

GitHub Pages 的发布来源设为 **Settings → Pages → Build and deployment → Source → GitHub Actions**。

[部署工作流](.github/workflows/deploy.yml)使用 Node.js 22.23.4，执行 `npm ci`、检查、测试和构建；全部通过后，将 `dist/` 发布至 `https://lte-z.github.io/`。推送到 `main` 自动触发，也可在 Actions 页面选择该工作流，通过 **Run workflow → main** 手动发布。

## 📝 内容维护

### Work：添加项目

1. 编辑 `src/data/projects.yaml`。空列表 `[]` 应替换为下面这种 YAML 数组；已有项目时追加一个 `-` 条目。
2. 填写必需的 `id`、`title`、`description`、`order`。`id` 使用小写字母、数字和连字符；`id`、`order` 在项目列表中各自唯一。

```yaml
- id: tech-site
  title: Tech Notes & Projects
  description: A technical site for software projects and development notes.
  order: 100
  languages: [Astro, TypeScript]
  github: https://github.com/lte-z/lte-z.github.io
  links:
    - label: Website
      url: https://lte-z.github.io/
```

项目按 `order` 降序显示，数值越小越靠下。以上为填写格式示例，实际展示内容由该 YAML 文件决定。

| 可选字段 | 填写方式 |
| :--- | :--- |
| `logo` | 先将图片放入 `public/assets/projects/`，再填写 `/assets/projects/name.svg`；支持 SVG、PNG、WebP、JPG、JPEG，路径使用英文字母、数字、斜杠、下划线和连字符 |
| `tone` | `lavender`、`rose`、`sage`、`sand`，默认 lavender |
| `languages` | 语言名称数组，缺省为空；常见语言使用对应标记色，其他使用默认色 |
| `github`、`gitee` | 对应平台的 HTTPS 仓库地址，按字段显示平台图标 |
| `sourceStatus` | `private` 显示 Private，`unavailable` 显示 Source unavailable；与 `github`／`gitee` 互斥 |
| `links` | 如示例所示，每项填写 `label` 和 HTTPS `url`，统一显示锁链图标 |

未填写 Logo 时使用默认代码图形，可选信息缺失时自动省略对应区域。项目中只有具体链接可点击。

### Blog：添加文章

1. 创建 `src/content/blog/<slug>/index.md`。slug 使用小写字母、数字和连字符，决定公开地址 `/blog/<slug>/`。
2. **将 YAML 元数据写在这个 `index.md` 的最开头、两行 `---` 之间；正文接在第二行 `---` 后。** 元数据与正文属于同一个 Markdown 文件。
3. 文章图片可放在同一目录；先准备图片，再按示例用 Markdown 相对路径引用。

```text
src/content/blog/first-blog-zh-cn/
├── index.md
└── diagram.png
```

`index.md` 的完整结构示例：

```markdown
---
title: "文章标题"
pubDate: "2026-10-28"
lang: zh-CN
order: 30
draft: true
---

## 开始

这里是文章正文。

![图示说明](./diagram.png)
```

| 字段 | 规则 |
| :--- | :--- |
| `title` | 必填，文章标题 |
| `pubDate` | 必填，带引号的真实 `YYYY-MM-DD` 日期 |
| `lang` | 必填，`en`、`zh-CN` 或 `ja` |
| `order` | 可选整数，默认 0；只控制同日文章的顺序，越小越靠下，可重复 |
| `description` | 可选，文章导语和分享说明 |
| `draft` | 可选，默认 false；true 时仅在 `npm run dev` 中预览 |

排序为**日期降序 → 同日 order 降序 → slug 升序**，归档、RSS 和前后篇导航共用这一规则。日期按 UTC 格式化；日期不承担定时发布功能。

三语版本可分别建立三个文章目录，使用各自的 `lang`；它们是三篇独立文章。需要相互引用时，链接使用公开地址，例如 `[English](/blog/first-blog-en/)`。同日可填写 30／20／10 控制显示顺序。

确认正文和资源后，将 `draft` 改为 false 发布。正文从 H2 开始，支持 GFM、脚注、代码高亮与复制、图片、表格和数学公式；至少两个 H2／H3 时生成桌面目录，870px 及以下隐藏。

### 图片、附件与验证

- **文章图片：**随 Markdown 放入文章目录，以 `![说明](./diagram.png)` 引用。Astro 构建时处理图片，源文件仍保留原位置。
- **下载附件：**将 PDF／ZIP 等文件放入 `public/files/<slug>/`，以 `[下载附件](/files/<slug>/appendix.pdf)` 引用；`public/` 内容原样发布。
- 文章和引用的源文件一同纳入 Git。电脑其他位置的文件需先复制到上述目录；站点不会自动导入或搬移本地文件。
- 内容修改后执行 `npm run check`、`npm test`、`npm run build`；通过后用 `npm run preview` 检查正式产物。

## 🎨 资源与结构

- Timeline 位于 `src/pages/index.astro` 的 `<ol class="timeline">` 中，直接按现有 `<li>` 结构增删，并手动维护时间顺序。
- 头像和站点图标：`public/assets/avatar/`；品牌图标：`public/assets/brand/`。
- 简历：替换 `public/resume.pdf`，公开地址保持 `/resume.pdf`。
- UI 使用 Atkinson Hyperlegible Next，斜体强调和归档年份使用 Fraunces，Home 字标使用 Playwrite DE LA，代码使用 JetBrains Mono，由 Google Fonts 提供。
- 中英日阅读内容统一使用本站的 Sarasa Gothic SC 1.0.36，含真实 400／600／700 及斜体；[来源说明](public/assets/fonts/sarasa-sc/SOURCE.md)、[许可证](public/assets/fonts/sarasa-sc/LICENSE.txt)。数学字体由 KaTeX 随构建发布。

站点部署路径为 `https://lte-z.github.io/` 根目录。路由、组件、样式与交互分别位于 `src/pages/`、`src/components/`、`src/styles/`、`src/scripts/`，内容字段规则集中在 `src/content.config.ts`。

## 📜 许可与署名

本站实现采用 [MIT License](LICENSE)，Copyright (c) 2026 lte_z。第三方资源遵循各自的许可证。

如果你基于本站搭建自己的网站，欢迎在页脚或关于页面注明原作者 `lte_z`，并优先链接至 [lte_z 的技术站点](https://lte-z.github.io/)，例如：

> Based on [lte_z’s technical site](https://lte-z.github.io/).