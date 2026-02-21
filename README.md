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
- **Note templates** — user-editable templates with `{{date}}`, `{{time}}`, `{{title}}` placeholders
- **Encryption** — AES-256-GCM at rest; passphrase entered once per session
- **iCloud sync** — across Macs (macOS only)

## Installation

Requires **macOS** and **Node.js 18+**.

```bash
npm install -g daily-organiser
daily
```

## First Run

On first launch, you'll be prompted to set a passphrase. This encrypts all your data before it's written to disk (including iCloud).

```
🔐 Setting up encryption for your data...
⚠️  WARNING: If you forget your passphrase, your data cannot be recovered.

Enter new passphrase:
Confirm passphrase:
✓ Encryption enabled. 0 file(s) encrypted.
```

On every subsequent launch, you'll see a single `Passphrase:` prompt. The key is held in memory for the session only — never written to disk.

> **Important:** There is no passphrase recovery. If you lose it, your data is unrecoverable.

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
| `edit template` | Edit the todo note template |
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
| `edit template` | Edit the note template |
| `rm <#\|search>` | Delete note |

### System (both modes)

| Command | Description |
|---------|-------------|
| `templates` | List both note templates |
| `info` | Storage location and sync status |
| `help` | Show help (context-aware per mode) |
| `exit` | Quit |

## Note Templates

New notes are created from editable templates stored in your data directory:

```
<data_dir>/templates/
  note.md       — standalone notes (add command)
  todo-note.md  — notes attached to todos (edit command)
```

Templates support three placeholders:

| Placeholder | Value |
|-------------|-------|
| `{{date}}` | Current date (`2026-02-21`) |
| `{{time}}` | Current time (`14:30`) |
| `{{title}}` | Note label or todo text |

Edit a template with `edit template` in the appropriate mode — notes mode edits the note template, todo mode edits the todo note template. Changes take effect immediately for all new notes.

## Storage

Your data is yours — no accounts, no third-party servers, no telemetry. Everything is stored locally and encrypted at rest using AES-256-GCM.

Data is kept in your iCloud directory if available, so it syncs automatically between your Macs:

```
~/Library/Mobile Documents/com~apple~CloudDocs/daily_organiser/
  todos.json          — encrypted todo store
  notes/              — encrypted note files
  templates/          — plain-text note templates (user-editable)
  .salt               — key derivation salt (not secret)
  .encrypted          — marker file (presence enables encryption)
```

Falls back to `~/.daily_organiser/` if iCloud isn't available.

Temp files created during note editing live in `$TMPDIR` (never in iCloud) and are deleted immediately after the editor closes.

## Roadmap

- [ ] Cross-platform support (Linux, Windows)
- [ ] Plugin system
- [ ] Alternative sync backends

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[ISC](LICENSE)
