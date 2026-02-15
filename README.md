# daily-organiser

A fast, interactive CLI for managing todos and notes from your terminal.

```
daily> add "Review PR" --due "2025-10-15 14:30"
✓ Added: Review PR (due Oct 15, 2:30 PM)

daily> list
  1. [ ] Review PR  ⏰ Oct 15, 2:30 PM
  2. [ ] Write docs
  3. [✓] Fix login bug

daily> done 1
✓ Completed: Review PR
```

## Features

- **Interactive REPL** — stays running for continuous use
- **Todo management** — add, complete, delete, reorder
- **Due dates** — with overdue warnings
- **Markdown notes** — attach to todos or standalone
- **iCloud sync** — across Macs (macOS only)

## Installation

Requires **macOS** and **Node.js 18+**.

```bash
npm install -g daily-organiser
daily
```

## Commands

### Todos

| Command | Description |
|---------|-------------|
| `list`, `ls` | List all todos |
| `add <text> [--due <date>]` | Add todo (date: `YYYY-MM-DD HH:mm`) |
| `show <#>` | Show todo with notes |
| `edit <#>` | Edit todo's notes |
| `done <#>` | Mark complete |
| `undone <#>` | Mark incomplete |
| `rm <#>` | Delete todo |
| `mv <#> <#>` | Reorder (e.g., `mv 1 3`, `mv 2 last`) |

### Notes

| Command | Description |
|---------|-------------|
| `n [label]` | Create note (opens in $EDITOR) |
| `n ls` | List all notes |
| `n show <#>` | Display note |
| `n edit <#>` | Edit note |
| `n rm <#>` | Delete note |

### System

| Command | Description |
|---------|-------------|
| `info` | Storage location and sync status |
| `help` | Show help |
| `exit` | Quit |

## Storage

Data syncs via iCloud Drive when available:

```
~/Library/Mobile Documents/com~apple~CloudDocs/daily_organiser/
```

Falls back to `~/.daily_organiser/` if iCloud isn't available.

## Roadmap

- [ ] Cross-platform support (Linux, Windows)
- [ ] Plugin system
- [ ] Alternative sync backends

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[ISC](LICENSE)
