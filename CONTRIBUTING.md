# Contributing to daily-organiser

Thanks for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/xeeevi/daily_organiser.git
cd daily_organiser

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start
```

## Code Style

- **TypeScript** with strict mode enabled
- Keep it simple—avoid over-engineering
- Follow existing patterns in the codebase

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

All PRs should include tests for new functionality.

## Making Changes

1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit with a clear message
6. Push and open a PR

## Data Safety

This tool manages user data. When modifying `storage.ts`, `commands.ts`, or `notes.ts`:

- Test with real data (in a separate directory)
- Handle edge cases gracefully
- Never risk data loss

## Questions?

Open an issue on GitHub.
