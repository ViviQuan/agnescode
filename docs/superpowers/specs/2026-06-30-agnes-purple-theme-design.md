# Agnes Purple Theme — Visual Redesign for AgnesCode

## Goal

Replace the default color theme of AgnesCode (forked from OpenCode) with a distinctive purple/cyan palette that visually differentiates it from upstream OpenCode, while keeping the layout structure unchanged.

## Design Direction: "Agnes Purple"

Chosen by the user from three proposals. A cool-tone purple/cyan palette with pink accent, inspired by the Agnes AI brand.

## Color Palette

### Dark Mode (default)

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#a78bfa` | Brand color, logo, links, active highlights |
| `secondary` | `#67e8f9` | Secondary highlights, complementary |
| `accent` | `#f9a8d4` | Emphasis, headings, keyword syntax |
| `background` | `#0a0a12` | Main background (purple-black tint) |
| `backgroundPanel` | `#11111d` | Sidebar, panels |
| `backgroundElement` | `#19192a` | Input fields, UI elements |
| `border` | `#2a2a42` | Default borders |
| `borderActive` | `#3d3d5c` | Active/focused borders |
| `borderSubtle` | `#222238` | Subtle borders |
| `text` | `#e2e2ef` | Body text |
| `textMuted` | `#8282a0` | Muted/secondary text |

### Syntax Colors (dark)

| Token | Hex |
|-------|-----|
| `syntaxComment` | `#6b6b85` |
| `syntaxKeyword` | `#c084fc` |
| `syntaxFunction` | `#a78bfa` |
| `syntaxVariable` | `#f87171` |
| `syntaxString` | `#4ade80` |
| `syntaxNumber` | `#fb923c` |
| `syntaxType` | `#fcd34d` |
| `syntaxOperator` | `#67e8f9` |
| `syntaxPunctuation` | `#e2e2ef` |

### Semantics

| Token | Dark | Light |
|-------|------|-------|
| `error` | `#f87171` | `#dc2626` |
| `warning` | `#fb923c` | `#d97706` |
| `success` | `#4ade80` | `#16a34a` |
| `info` | `#22d3ee` | `#0891b2` |

### Light Mode

| Token | Hex |
|-------|-----|
| `primary` | `#7c3aed` |
| `secondary` | `#0891b2` |
| `accent` | `#db2777` |
| `background` | `#f8f8ff` |
| `backgroundPanel` | `#f0f0fa` |
| `backgroundElement` | `#e8e8f4` |
| `text` | `#1a1a2e` |
| `textMuted` | `#666680` |

## UI Additions

These are small changes that add brand identity without altering the layout:

1. **Home screen brand tagline** — Below the ASCII logo, render `"Your Agnes AI Coding Agent"` in `secondary` (cyan). Implemented in `routes/home.tsx` or via `home_bottom` slot.

2. **Prompt active border** — When the textarea is focused, use `primary` purple as the border color. This already exists in the Ink `useFocus` system; just ensure the theme token is wired correctly.

3. **Sidebar footer** — Already shows "AgnesCode" via the registered plugin; no change needed.

## What Does NOT Change

- The overall TUI layout (sidebar position, message area, prompt position, dialog system, plugin slot system)
- The plugin system, router, or state management
- Provider registration, API calls, or any non-UI code
- The ASCII logo (already redesigned earlier)

## Files to Modify

1. `packages/tui/src/theme/assets/agnescode.json` — Complete color palette replacement
2. `packages/tui/src/routes/home.tsx` — Add brand tagline below logo (1-2 lines)
3. `packages/tui/src/component/prompt/prompt.tsx` — Ensure focused prompt border uses primary

## Future Considerations

- The theme file format supports both dark/light variants; both are included for completeness
- Users can still switch to any of the other 33 built-in themes via `/theme` command
