# daily-organiser

A fast, interactive CLI for managing todos and notes from your terminal — with workspaces to keep contexts separate.

```
daily:work:todo> add "Review PR" --due "2025-10-15 14:30"
✓ Added: Review PR

daily:work:todo> ls
  1. [ ] Review PR  ⏰ Oct 15, 2:30 PM
  2. [ ] Write docs

daily:work:todo> workspace personal
Switched to workspace personal

daily:personal:todo> ls
No todos yet.
```

## Features

- **Workspaces** — independent todo + notes contexts (work, personal, side projects)
- **Interactive REPL** — stays running for continuous use
- **Todo management** — add, complete, delete, reorder
- **Due dates** — with overdue warnings
- **Markdown notes** — attach to todos or standalone
- **Note templates** — user-editable with `{{date}}`, `{{time}}`, `{{title}}` placeholders
- **Per-workspace encryption** — AES-256-GCM at rest; passphrase entered once per session
- **iCloud sync** — across Macs (macOS only)

## Installation

Requires **macOS** and **Node.js 18+**.

```bash
npm install -g daily-organiser
daily
```

## First Run

On first launch you'll be prompted to name your workspace:

```
Welcome to Daily Organiser! Create your first workspace:
Workspace name: personal
```

If you have existing data from a previous version, you'll be prompted to name it — your data migrates automatically, nothing is lost.

If encryption is enabled, you'll be prompted for a passphrase once per session. The key is held in memory only — never written to disk.

> **Important:** There is no passphrase recovery. If you lose it, your data is unrecoverable.

## Commands

### Workspaces

| Command | Description |
|---------|-------------|
| `workspace list` | List all workspaces; active marked `*`, default marked `(default)` |
| `workspace new <name>` | Create a new workspace |
| `workspace <name>` | Switch to a workspace |
| `workspace default <name>` | Set the default workspace (opened on next launch) |
| `workspace delete <name>` | Delete a workspace and all its data |

Workspace names: letters, numbers, `-` and `_`, up to 50 characters.

Open directly into a workspace from the shell:

```bash
daily --workspace work
```

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
| `info` | Show workspace, storage location, sync status |
| `help` | Show help (context-aware per mode) |
| `exit` | Quit |

## Note Templates

New notes are created from editable templates stored per workspace:

```
<data_dir>/workspaces/<name>/templates/
  note.md       — standalone notes (add command in notes mode)
  todo-note.md  — notes attached to todos (edit command in todo mode)
```

Templates support three placeholders:

| Placeholder | Value |
|-------------|-------|
| `{{date}}` | Current date (`2026-02-21`) |
| `{{time}}` | Current time (`14:30`) |
| `{{title}}` | Note label or todo text |

Edit a template with `edit template` in the appropriate mode. Changes take effect immediately for all new notes.

## Storage

No accounts, no servers, no telemetry. All data is stored locally, encrypted at rest.

Data lives in your iCloud directory if available (syncs automatically between Macs), otherwise falls back to `~/.daily_organiser/`:

```
~/Library/Mobile Documents/com~apple~CloudDocs/daily_organiser/
  workspaces.json             — workspace registry
  workspaces/
    <name>/
      todos.json              — encrypted todo store
      notes/                  — encrypted note files
      templates/              — plain-text note templates
      .salt                   — key derivation salt (not secret)
      .encrypted              — presence enables encryption for this workspace
```

Each workspace has its own encryption passphrase and key. Temp files during note editing live in `$TMPDIR` and are deleted immediately after the editor closes.

## Migrating from v1.2.x

Run `daily` — you'll be prompted to name your existing workspace. All data (`todos.json`, `notes/`, `templates/`, encryption files) is moved automatically via `renameSync`. No manual steps needed.

## Roadmap

- [ ] Cross-platform support (Linux, Windows)
- [ ] Plugin system
- [ ] Alternative sync backends

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[ISC](LICENSE)
