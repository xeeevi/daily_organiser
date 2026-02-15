# daily-organiser

A fast, interactive CLI for managing todos and notes from your terminal.

```
daily:todo> add "Review PR" --due "2025-10-15 14:30"
✓ Added: Review PR (due Oct 15, 2:30 PM)

daily:todo> ls
  1. [ ] Review PR  ⏰ Oct 15, 2:30 PM
  2. [ ] Write docs
  3. [✓] Fix login bug

daily:todo> done 1
✓ Completed: Review PR

daily:todo> notes
Switched to notes mode

daily:notes> ls
No notes yet. Create one with: add
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

### Mode Switching

| Command | Description |
|---------|-------------|
| `todo` | Switch to todo mode |
| `notes`, `n` | Switch to notes mode |

### Todo Mode

| Command | Description |
|---------|-------------|
| `ls` | List all todos |
| `add <text> [--due <date>]` | Add todo (date: `YYYY-MM-DD HH:mm`) |
| `cat <#>` | Show todo with notes |
| `edit <#>` | Edit todo's notes |
| `done <#>`, `toggle <#>` | Toggle completion |
| `rm <#>` | Delete todo |
| `mv <#> <#>` | Reorder (e.g., `mv 1 3`, `mv 2 last`) |

### Notes Mode

| Command | Description |
|---------|-------------|
| `add [label]` | Create note (opens in $EDITOR) |
| `ls` | List all notes |
| `cat <#\|search>` | Display note |
| `edit <#\|search>` | Edit note |
| `rm <#\|search>` | Delete note |

### System (both modes)

| Command | Description |
|---------|-------------|
| `info` | Storage location and sync status |
| `help` | Show help (context-aware per mode) |
| `exit` | Quit |

## Storage

Your data is yours. Everything is stored as plain JSON and Markdown files on your local filesystem — no accounts, no third-party servers, no telemetry. If iCloud Drive is available, data is kept in your iCloud directory and synced by Apple between your devices:

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
