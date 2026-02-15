# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025

### Added

- **Mode-based REPL**: `todo` and `notes` modes with dedicated command sets
- `toggle` command replacing separate `complete`/`undone` commands
- `cat` command for viewing todo details and note content
- Integration and E2E tests for commands, notes, date parser, and REPL (63 tests)

### Changed

- REPL prompt now shows current mode (`daily:todo>`, `daily:notes>`)
- Notes commands are now first-class in notes mode (no `n` prefix needed)

## [1.0.0] - 2025

### Added

- Interactive REPL interface with command history
- Todo management: add, complete, delete, reorder
- Due date support with overdue warnings
- Todo-linked notes (edit/show commands)
- Standalone notes for meetings with markdown support
- iCloud Drive sync for cross-Mac synchronization
- `move`/`mv` command for reordering todos
- `info` command to check storage and sync status
