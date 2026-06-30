<p align="center">
  <pre>

█████╗  ██████╗ ███╗   ██╗███████╗███████╗ ██████╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔════╝ ████╗  ██║██╔════╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
███████║██║  ███╗██╔██╗ ██║█████╗  ███████╗██║     ██║   ██║██║  ██║█████╗
██╔══██║██║   ██║██║╚██╗██║██╔══╝  ╚════██║██║     ██║   ██║██║  ██║██╔══╝
██║  ██║╚██████╔╝██║ ╚████║███████╗███████║╚██████╗╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝

  </pre>
</p>

<p align="center"><strong>AgnesCode</strong> — Terminal-native AI coding agent. Built-in Agnes AI, free multimodal API. Powered by <a href="https://github.com/anomalyco/opencode">OpenCode</a>.</p>

<p align="center">
  <a href="README.zh.md">简体中文</a> | English
</p>

<p align="center">
  <a href="https://agnes-ai.com">Agnes AI</a> | <a href="https://github.com/anomalyco/opencode">OpenCode</a>
</p>

---

AgnesCode is a terminal-native AI coding agent that comes with the **Agnes AI** provider built-in — free multimodal API (text, image, video), no credit card required. It supports any OpenAI-compatible provider, features a full TUI, LSP, MCP, and plugin system.

---

## Quick Start

```bash
# Clone and build from source
git clone https://github.com/ViviQuan/agnescode
cd AgnesCode
bun install
bun run dev
```

> **Note:** Prebuilt binaries and npm packages are coming soon. For now, development mode via `bun run dev` is the only supported way to run AgnesCode.

On first launch, AgnesCode opens the provider connection dialog where you can enter your Agnes AI API key. Get one for free at [https://agnes-ai.com](https://agnes-ai.com).

---

## Core Features

### Built-in Agnes AI

AgnesCode ships with the **Agnes AI** provider configured out of the box.

| Model | Context | Pricing |
|-------|---------|---------|
| `agnes-2.0-flash` | 512K tokens | Free (promotional) |
| `agnes-1.5-flash` | 256K tokens | Free (promotional) |

Both models support image input (via URL), streaming, and multi-turn conversations. `agnes-2.0-flash` additionally supports tool calling, reasoning mode, and agent workflows — making it the recommended default for coding tasks.

The default theme, "Agnes Purple", uses the Agnes brand colors with a pulsing ring animation on the home screen.

### Multiple Providers

Beyond the built-in Agnes AI, AgnesCode supports any OpenAI-compatible provider. Use `/connect` to add additional providers.

### Multiple Agents

| Agent | Description |
|-------|-------------|
| **build** | Default. Full tool permissions for development |
| **plan** | Read-only analysis mode for code exploration and solution design |

Press `Tab` to switch between agents.

### Full TUI

- **Sidebar** — session context, modified files, LSP diagnostics, MCP servers, TODO
- **Diff viewer** — inline code diffs with syntax highlighting
- **Command palette** — `/` for quick commands
- **Custom themes** — 34 built-in themes, switch via `/theme`
- **Keybindings** — fully customizable

### MCP & LSP Support

- **MCP** — connect to Model Context Protocol servers for tool access
- **LSP** — language server protocol for code intelligence (diagnostics, hover, go-to-definition)

---

## Configuration

AgnesCode is configured via `.agnescode/agnescode.json` in the project directory (or `~/.config/agnescode/agnescode.json` globally). Key options include:

- Provider and model selection
- Agent permissions and custom agents
- MCP server connections
- Keybindings and theme

---

## Development

```bash
git clone https://github.com/ViviQuan/agnescode
cd agnescode
bun install
bun run dev              # Run in development mode
bun turbo typecheck      # Type check
```

---

## Relationship to OpenCode

AgnesCode is built as a fork of [OpenCode](https://github.com/anomalyco/opencode). It inherits OpenCode's core architecture (TUI, multi-provider, LSP, MCP, plugins) and replaces the default provider with Agnes AI. If you are building your own fork, add a note to your README to clarify the relationship.

---

## License

[MIT License](./LICENSE).
