import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_PARENT = path.join(os.tmpdir(), '.daily_notes_test_' + Date.now());

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
  return { default: passthrough, __esModule: true };
});

jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 })),
}));

import { editNote, listNotes, showNote, deleteNote } from '../notes';
import { getStorageLocation } from '../storage';

let logOutput: string[];
const originalLog = console.log;

beforeEach(() => {
  const storageDir = path.join(TEST_PARENT, '.daily_organiser');
  if (fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true });
  }

  logOutput = [];
  console.log = (...args: any[]) => {
    logOutput.push(args.join(' '));
  };
});

afterEach(() => {
  console.log = originalLog;
});

afterAll(() => {
  console.log = originalLog;
  if (fs.existsSync(TEST_PARENT)) {
    fs.rmSync(TEST_PARENT, { recursive: true });
  }
});

describe('editNote (create)', () => {
  it('should create a note file with template when called with no args', () => {
    editNote();

    // Find the created note file
    const notesDir = path.join(getStorageLocation(), 'notes');
    expect(fs.existsSync(notesDir)).toBe(true);

    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    expect(files).toHaveLength(1);

    const content = fs.readFileSync(path.join(notesDir, files[0]), 'utf-8');
    expect(content).toContain('Meeting Notes');
    expect(content).toContain('Attendees');
  });

  it('should create a note file with label in filename', () => {
    editNote('standup');

    const notesDir = path.join(getStorageLocation(), 'notes');
    const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('standup');
  });

  it('should show success message', () => {
    editNote();
    expect(logOutput.some(l => l.includes('Note saved'))).toBe(true);
  });
});

describe('listNotes', () => {
  it('should show empty message when no notes exist', () => {
    // Ensure notes dir exists but is empty
    const notesDir = path.join(getStorageLocation(), 'notes');
    fs.mkdirSync(notesDir, { recursive: true });

    listNotes();
    expect(logOutput.some(l => l.includes('No notes yet'))).toBe(true);
  });

  it('should list existing notes', () => {
    // Create some notes
    editNote('meeting1');
    logOutput = [];

    listNotes();
    expect(logOutput.some(l => l.includes('meeting1'))).toBe(true);
  });
});

describe('showNote', () => {
  it('should show note content by index', () => {
    editNote('test-note');
    logOutput = [];

    showNote('1');
    expect(logOutput.some(l => l.includes('Meeting Notes'))).toBe(true);
  });

  it('should show note content by search term', () => {
    editNote('unique-label');
    logOutput = [];

    showNote('unique-label');
    expect(logOutput.some(l => l.includes('Meeting Notes'))).toBe(true);
  });

  it('should show error for non-existent note', () => {
    showNote('nonexistent');
    expect(logOutput.some(l => l.includes('Note not found'))).toBe(true);
  });
});

describe('deleteNote', () => {
  it('should delete a note by index', () => {
    editNote('to-delete');

    const notesDir = path.join(getStorageLocation(), 'notes');
    let files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    expect(files).toHaveLength(1);

    logOutput = [];
    deleteNote('1');

    files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
    expect(files).toHaveLength(0);
    expect(logOutput.some(l => l.includes('Note deleted'))).toBe(true);
  });

  it('should show error for non-existent note', () => {
    deleteNote('99');
    expect(logOutput.some(l => l.includes('Note not found'))).toBe(true);
  });
});
