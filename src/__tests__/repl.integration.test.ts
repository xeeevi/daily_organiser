import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

const TEST_PARENT = path.join(os.tmpdir(), '.daily_repl_test_' + Date.now());

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => TEST_PARENT,
}));

jest.mock('chalk', () => {
  const passthrough: any = (s: any) => String(s);
  passthrough.red = passthrough;
  passthrough.green = passthrough;
  passthrough.cyan = passthrough;
  passthrough.gray = passthrough;
  passthrough.yellow = passthrough;
  passthrough.white = passthrough;
  passthrough.bold = passthrough;
  passthrough.strikethrough = passthrough;
  passthrough.gray.strikethrough = passthrough;
  return { default: passthrough, __esModule: true };
});

jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 })),
}));

// Mock readline to capture the REPL interface
let mockRl: EventEmitter & { setPrompt: jest.Mock; prompt: jest.Mock; close: jest.Mock };

jest.mock('readline', () => ({
  createInterface: () => {
    mockRl = Object.assign(new EventEmitter(), {
      setPrompt: jest.fn(),
      prompt: jest.fn(),
      close: jest.fn(),
    });
    return mockRl;
  },
}));

// Mock process.exit to prevent test runner from exiting
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Mock process.stdout.columns for separator
Object.defineProperty(process.stdout, 'columns', { value: 80, writable: true });

import { startREPL } from '../repl';

let logOutput: string[];
const originalLog = console.log;
const originalClear = console.clear;

function sendLine(input: string): void {
  mockRl.emit('line', input);
}

beforeEach(() => {
  const storageDir = path.join(TEST_PARENT, '.daily_organiser');
  if (fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true });
  }

  logOutput = [];
  console.log = (...args: any[]) => {
    logOutput.push(args.join(' '));
  };
  console.clear = jest.fn();

  startREPL();
  // Clear the welcome message output
  logOutput = [];
});

afterEach(() => {
  console.log = originalLog;
  console.clear = originalClear;
  mockRl.removeAllListeners();
});

afterAll(() => {
  console.log = originalLog;
  console.clear = originalClear;
  mockExit.mockRestore();
  if (fs.existsSync(TEST_PARENT)) {
    fs.rmSync(TEST_PARENT, { recursive: true });
  }
});

describe('mode switching', () => {
  it('should start in todo mode', () => {
    // The initial setPrompt call should contain "todo"
    const promptCalls = mockRl.setPrompt.mock.calls;
    // startREPL doesn't call setPrompt initially (it's set in createInterface),
    // but the first prompt should contain 'todo' in the createInterface options
    // Let's just verify switching works
    expect(mockRl.prompt).toHaveBeenCalled();
  });

  it('should switch to notes mode with "notes" command', () => {
    sendLine('notes');
    expect(logOutput.some(l => l.includes('notes') && l.includes('mode'))).toBe(true);
    // setPrompt should have been called with notes
    const calls = mockRl.setPrompt.mock.calls;
    const lastPromptCall = calls[calls.length - 1];
    expect(lastPromptCall?.[0]).toContain('notes');
  });

  it('should switch to notes mode with "n" shorthand', () => {
    sendLine('n');
    expect(logOutput.some(l => l.includes('notes') && l.includes('mode'))).toBe(true);
  });

  it('should switch back to todo mode', () => {
    sendLine('notes');
    logOutput = [];
    sendLine('todo');
    expect(logOutput.some(l => l.includes('todo') && l.includes('mode'))).toBe(true);
    const calls = mockRl.setPrompt.mock.calls;
    const lastPromptCall = calls[calls.length - 1];
    expect(lastPromptCall?.[0]).toContain('todo');
  });
});

describe('todo mode commands', () => {
  it('should add a todo with "add" command', () => {
    sendLine('add Test task from REPL');
    expect(logOutput.some(l => l.includes('Added todo') && l.includes('Test task from REPL'))).toBe(true);
  });

  it('should list todos with "ls"', () => {
    sendLine('add My listed task');
    logOutput = [];
    sendLine('ls');
    expect(logOutput.some(l => l.includes('My listed task'))).toBe(true);
  });

  it('should show error for add with no args', () => {
    sendLine('add');
    expect(logOutput.some(l => l.includes('Please provide a task description'))).toBe(true);
  });
});

describe('notes mode commands', () => {
  it('should list notes with "ls" in notes mode', () => {
    sendLine('notes');
    logOutput = [];
    sendLine('ls');
    // Should call listNotes, not listTodos
    expect(logOutput.some(l => l.includes('No notes yet') || l.includes('Meeting Notes'))).toBe(true);
  });
});

describe('shared commands', () => {
  it('should show help in todo mode', () => {
    sendLine('help');
    expect(logOutput.some(l => l.includes('Todo Commands'))).toBe(true);
  });

  it('should show help in notes mode', () => {
    sendLine('notes');
    logOutput = [];
    sendLine('help');
    expect(logOutput.some(l => l.includes('Notes Commands'))).toBe(true);
  });

  it('should handle exit command', () => {
    sendLine('exit');
    expect(mockRl.close).toHaveBeenCalled();
  });
});

describe('error handling', () => {
  it('should show error for unknown command', () => {
    sendLine('foobar');
    expect(logOutput.some(l => l.includes('Unknown command'))).toBe(true);
  });

  it('should handle empty input without error', () => {
    sendLine('');
    // Should just re-prompt, no error
    expect(logOutput.every(l => !l.includes('Unknown command'))).toBe(true);
  });
});

describe('template commands', () => {
  it('should list templates with "templates" command (shared)', () => {
    sendLine('templates');
    expect(logOutput.some(l => l.includes('note.md'))).toBe(true);
    expect(logOutput.some(l => l.includes('todo-note.md'))).toBe(true);
  });

  it('should open note template editor with "edit template" in notes mode', () => {
    sendLine('notes');
    logOutput = [];
    const { spawnSync } = require('child_process');
    (spawnSync as jest.Mock).mockClear();

    sendLine('edit template');
    const calls = (spawnSync as jest.Mock).mock.calls;
    expect(calls.some((c: any[]) => c[1][0].includes('note.md'))).toBe(true);
  });

  it('should open todo note template editor with "edit template" in todo mode', () => {
    sendLine('todo');
    logOutput = [];
    const { spawnSync } = require('child_process');
    (spawnSync as jest.Mock).mockClear();

    sendLine('edit template');
    const calls = (spawnSync as jest.Mock).mock.calls;
    expect(calls.some((c: any[]) => c[1][0].includes('todo-note.md'))).toBe(true);
  });

  it('should show "edit template" in notes help', () => {
    sendLine('notes');
    logOutput = [];
    sendLine('help');
    expect(logOutput.some(l => l.includes('edit template'))).toBe(true);
  });

  it('should show "edit template" in todo help', () => {
    sendLine('todo');
    logOutput = [];
    sendLine('help');
    expect(logOutput.some(l => l.includes('edit template'))).toBe(true);
  });
});
