# Sarasa Gothic SC Webfont

- 上游：[Sarasa Gothic v1.0.36](https://github.com/be5invis/Sarasa-Gothic/releases/tag/v1.0.36)。
- 原包：`SarasaGothicSC-TTF-1.0.36.7z`。
- 原包 SHA-256：`37bb7d24e4553e37e63e761cf4dee898fc8662b20fd55f465d3d481b35d3f9d7`。
- 使用 Regular、SemiBold、Bold 及其真实 Italic，字重分别为 400、600、700。
- 使用 FontTools 与 Brotli 转为 WOFF2；保留所有上游支持的 Unicode 字符、字体名称和布局特性。Latin、假名及其他每 4096 码位范围分别分片，按 `unicode-range` 加载。
- 假名分片不保留 TrueType hinting，避免小字号笔画显示异常；其余分片保留上游 hinting。
- `fonts.css` 不包含 `local()`，避免本机其他版本介入。`manifest.json` 记录生成文件的字重、样式和校验值。
- 许可证原文见 `LICENSE.txt`。源 TTF 不随网站分发；正常网站构建无需字体转换环境。