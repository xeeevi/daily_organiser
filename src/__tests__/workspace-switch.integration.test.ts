import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

const TEST_PARENT = path.join(os.tmpdir(), '.daily_wsswitch_test_' + Date.now());

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

const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
Object.defineProperty(process.stdout, 'columns', { value: 80, writable: true });

import { startREPL } from '../repl';
import { setActiveDataDir } from '../storage';
import { createWorkspace, getWorkspaceDir } from '../workspace';

const ROOT = path.join(TEST_PARENT, '.daily_organiser');

let logOutput: string[];
const originalLog = console.log;
const originalClear = console.clear;

function sendLine(input: string): void {
  mockRl.emit('line', input);
}

async function sendWorkspaceCommand(input: string): Promise<void> {
  sendLine(input);
  // Wait for the async workspace handler to complete
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));
}

beforeEach(() => {
  // Set up two workspaces
  if (fs.existsSync(ROOT)) {
    fs.rmSync(ROOT, { recursive: true });
  }
  fs.mkdirSync(ROOT, { recursive: true });

  createWorkspace(ROOT, 'personal');
  createWorkspace(ROOT, 'work');

  const personalDir = getWorkspaceDir(ROOT, 'personal');
  setActiveDataDir(personalDir);

  logOutput = [];
  console.log = (...args: any[]) => {
    logOutput.push(args.join(' '));
  };
  console.clear = jest.fn();

  startREPL('personal');
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

describe('workspace list', () => {
  it('lists all workspaces', async () => {
    await sendWorkspaceCommand('workspace list');
    expect(logOutput.some(l => l.includes('personal'))).toBe(true);
    expect(logOutput.some(l => l.includes('work'))).toBe(true);
  });

  it('marks the active workspace with *', async () => {
    await sendWorkspaceCommand('workspace list');
    const activeLine = logOutput.find(l => l.includes('personal'));
    expect(activeLine).toBeDefined();
    expect(activeLine).toContain('*');
  });
});

describe('workspace new', () => {
  it('creates a new workspace', async () => {
    await sendWorkspaceCommand('workspace new side-project');
    expect(logOutput.some(l => l.includes('created') || l.includes('side-project'))).toBe(true);
    expect(fs.existsSync(getWorkspaceDir(ROOT, 'side-project'))).toBe(true);
  });

  it('rejects duplicate workspace names', async () => {
    await sendWorkspaceCommand('workspace new work');
    expect(logOutput.some(l => l.includes('already exists'))).toBe(true);
  });

  it('rejects invalid names', async () => {
    await sendWorkspaceCommand('workspace new "has space"');
    expect(logOutput.some(l => l.includes('Invalid name'))).toBe(true);
  });
});

describe('workspace switch', () => {
  it('switches to another workspace', async () => {
    await sendWorkspaceCommand('workspace work');
    expect(mockRl.setPrompt.mock.calls.some((c: any[]) => c[0].includes('work'))).toBe(true);
  });

  it('shows error for non-existent workspace', async () => {
    await sendWorkspaceCommand('workspace nonexistent');
    expect(logOutput.some(l => l.includes('does not exist'))).toBe(true);
  });

  it('data is isolated between workspaces', async () => {
    // Add todo in personal workspace
    sendLine('add Personal task');
    logOutput = [];

    // Switch to work
    await sendWorkspaceCommand('workspace work');
    logOutput = [];

    // List todos in work — should be empty
    sendLine('ls');
    expect(logOutput.some(l => l.includes('No todos yet'))).toBe(true);
  });
});

describe('workspace default', () => {
  it('sets the default workspace', async () => {
    await sendWorkspaceCommand('workspace default work');
    expect(logOutput.some(l => l.includes('Default workspace set to') || l.includes('work'))).toBe(true);

    const { loadRegistry } = require('../workspace');
    const reg = loadRegistry(ROOT);
    expect(reg.defaultWorkspace).toBe('work');
  });

  it('shows error for non-existent workspace', async () => {
    await sendWorkspaceCommand('workspace default missing');
    expect(logOutput.some(l => l.includes('does not exist'))).toBe(true);
  });
});

describe('workspace delete', () => {
  it('deletes a non-active workspace', async () => {
    await sendWorkspaceCommand('workspace delete work');
    expect(logOutput.some(l => l.includes('deleted') || l.includes('work'))).toBe(true);
    expect(fs.existsSync(getWorkspaceDir(ROOT, 'work'))).toBe(false);
  });

  it('refuses to delete the active workspace', async () => {
    await sendWorkspaceCommand('workspace delete personal');
    expect(logOutput.some(l => l.includes('Cannot delete the active workspace'))).toBe(true);
  });

  it('shows error for non-existent workspace', async () => {
    await sendWorkspaceCommand('workspace delete missing');
    expect(logOutput.some(l => l.includes('does not exist'))).toBe(true);
  });
});
