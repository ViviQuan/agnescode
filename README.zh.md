<pre>

█████╗  ██████╗ ███╗   ██╗███████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝ ████╗  ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████║██║  ███╗██╔██╗ ██║█████╗  ███████╗██║     ██║   ██║██║  ██║█████╗
██╔══██║██║   ██║██║╚██╗██║██╔══╝  ╚════██║██║     ██║   ██║██║  ██║██╔══╝
██║  ██║╚██████╔╝██║ ╚████║███████╗███████║╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝

</pre>

<p align="center"><strong>AgnesCode</strong> — 终端原生 AI 编程助手。内置 Agnes AI，免费多模态 API。基于 <a href="https://github.com/anomalyco/opencode">OpenCode</a> 构建。</p>

<p align="center">
  简体中文 | <a href="README.md">English</a>
</p>

<p align="center">
  <a href="https://agnes-ai.com">Agnes AI</a> | <a href="https://github.com/anomalyco/opencode">OpenCode</a>
</p>

---

AgnesCode 是一款终端原生 AI 编程助手，内置 **Agnes AI** 支持——免费的多模态 API（文本、图像、视频），无需信用卡。同时兼容任意 OpenAI 兼容的 API 提供商，支持完整 TUI、LSP、MCP 和插件系统。

---

## 快速开始

```bash
# 通过 npm 安装（推荐）
npm install -g agnescode

# 运行
agnes

# 或通过 curl 安装（自动下载二进制）
curl -fsSL https://raw.githubusercontent.com/ViviQuan/agnescode/main/install | bash

# 或克隆源码构建
git clone https://github.com/ViviQuan/agnescode
cd agnescode
bun install
bun run dev
```

首次启动时，AgnesCode 会自动弹出 API Key 配置界面。免费获取 API Key：[https://agnes-ai.com](https://agnes-ai.com)。

---

## 核心功能

### 内置 Agnes AI

AgnesCode 出厂即内置 **Agnes AI** 提供商，开箱即用。

| 模型 | 上下文 | 价格 |
|------|--------|------|
| `agnes-2.5-flash` | 512K tokens | 免费（推广期） |
| `agnes-2.0-flash` | 512K tokens | 免费（推广期） |

两个模型均支持图片输入（URL 方式）、流式输出和多轮对话。`agnes-2.5-flash` 与 `agnes-2.0-flash` 额外支持工具调用、推理模式和 Agent 工作流。`agnes-2.5-flash` 是 2.0 的灰度升级模型，针对编码、智能体工作流和工具调用体验进行了优化；`agnes-2.0-flash` 仍作为稳定默认回退模型。

首页使用 "Agnes Purple" 紫色主题，配有脉冲光环背景动画。

### 多提供商支持

除内置的 Agnes AI 外，AgnesCode 支持任意 OpenAI 兼容的 API 提供商。使用 `/connect` 添加更多配置。

### 多 Agent 切换

| Agent | 说明 |
|-------|------|
| **build** | 默认模式，完整工具权限，适合开发 |
| **plan** | 只读分析模式，适合代码探索和方案设计 |

按 `Tab` 键快速切换。

### 完整 TUI

- **侧边栏** — 会话上下文、修改文件、LSP 诊断、MCP 服务器、TODO
- **Diff 查看器** — 语法高亮的行内代码对比
- **命令面板** — 输入 `/` 快速执行命令
- **自定义主题** — 内置 34 款主题，通过 `/theme` 切换
- **快捷键** — 完全可自定义

### MCP & LSP

- **MCP** — 连接 Model Context Protocol 服务器，扩展工具能力
- **LSP** — 语言服务器协议，提供代码智能（诊断、悬停、跳转定义）

---

## 配置

AgnesCode 通过项目目录下的 `.agnescode/agnescode.json`（或全局 `~/.config/agnescode/agnescode.json`）进行配置。主要配置项：

- 提供商和模型选择
- Agent 权限和自定义 Agent
- MCP 服务器连接
- 快捷键和主题

---

## 开发

```bash
git clone https://github.com/ViviQuan/agnescode
cd agnescode
bun install
bun run dev              # 开发模式运行
bun turbo typecheck      # 类型检查
```

---

## 与 OpenCode 的关系

AgnesCode 是 [OpenCode](https://github.com/anomalyco/opencode) 的一个分支。它继承了 OpenCode 的核心架构（TUI、多提供商、LSP、MCP、插件系统），并将默认提供商替换为 Agnes AI。如果你也在构建自己的分支，请在 README 中注明关系。

---

## 许可证

[MIT License](./LICENSE)。
