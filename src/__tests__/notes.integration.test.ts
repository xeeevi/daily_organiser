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

import { editNote, listNotes, showNote, deleteNote, getTemplate, editTemplate, listTemplates } from '../notes';
import { getStorageLocation, setActiveDataDir } from '../storage';

let logOutput: string[];
const originalLog = console.log;

beforeEach(() => {
  const storageDir = path.join(TEST_PARENT, '.daily_organiser');
  setActiveDataDir(storageDir);
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

describe('templates', () => {
  describe('getTemplate', () => {
    it('substitutes {{date}} in note template', () => {
      const result = getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      expect(result).toContain('2026-02-21');
    });

    it('substitutes {{time}} in note template', () => {
      const result = getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      expect(result).toContain('14:30');
    });

    it('substitutes {{title}} in todo-note template', () => {
      const result = getTemplate('todo-note', { title: 'My todo task', date: '2026-02-21', time: '09:00' });
      expect(result).toContain('My todo task');
    });

    it('default note template contains expected sections', () => {
      const result = getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      expect(result).toContain('Meeting Notes');
      expect(result).toContain('Attendees');
      expect(result).toContain('Agenda');
      expect(result).toContain('Action Items');
    });

    it('default todo-note template contains Notes section', () => {
      const result = getTemplate('todo-note', { title: 'Fix bug', date: '2026-02-21', time: '10:00' });
      expect(result).toContain('Fix bug');
      expect(result).toContain('Notes');
    });

    it('creates template directory and default files on first use', () => {
      const templatesDir = path.join(getStorageLocation(), 'templates');
      expect(fs.existsSync(templatesDir)).toBe(false); // not yet created

      getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });

      expect(fs.existsSync(templatesDir)).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'note.md'))).toBe(true);
      expect(fs.existsSync(path.join(templatesDir, 'todo-note.md'))).toBe(true);
    });

    it('uses custom template content after user edits it', () => {
      const templatesDir = path.join(getStorageLocation(), 'templates');
      fs.mkdirSync(templatesDir, { recursive: true });
      fs.writeFileSync(
        path.join(templatesDir, 'note.md'),
        '# Custom {{date}}\n\nMy custom section\n',
        'utf-8'
      );
      const result = getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      expect(result).toContain('Custom 2026-02-21');
      expect(result).toContain('My custom section');
      expect(result).not.toContain('Attendees');
    });
  });

  describe('editNote uses template', () => {
    it('creates note file with today\'s date from template', () => {
      editNote();

      const notesDir = path.join(getStorageLocation(), 'notes');
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
      expect(files).toHaveLength(1);

      const content = fs.readFileSync(path.join(notesDir, files[0]), 'utf-8');
      // Template substitutes {{date}} — should contain current year at minimum
      const currentYear = new Date().getFullYear().toString();
      expect(content).toContain(currentYear);
    });

    it('does not contain unsubstituted placeholders', () => {
      editNote('my-label');

      const notesDir = path.join(getStorageLocation(), 'notes');
      const files = fs.readdirSync(notesDir).filter(f => f.endsWith('.md'));
      const content = fs.readFileSync(path.join(notesDir, files[0]), 'utf-8');

      expect(content).not.toContain('{{date}}');
      expect(content).not.toContain('{{time}}');
      expect(content).not.toContain('{{title}}');
    });
  });

  describe('listTemplates', () => {
    it('lists both template files', () => {
      // Trigger creation
      getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      logOutput = [];

      listTemplates();
      expect(logOutput.some(l => l.includes('note.md'))).toBe(true);
      expect(logOutput.some(l => l.includes('todo-note.md'))).toBe(true);
    });
  });

  describe('editTemplate', () => {
    it('opens note.md template in editor', () => {
      const { spawnSync } = require('child_process');
      // Trigger template creation first
      getTemplate('note', { title: '', date: '2026-02-21', time: '14:30' });
      (spawnSync as jest.Mock).mockClear();

      editTemplate('note');

      const calls = (spawnSync as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][1][0]).toContain('note.md');
    });

    it('opens todo-note.md template in editor', () => {
      const { spawnSync } = require('child_process');
      getTemplate('todo-note', { title: '', date: '2026-02-21', time: '14:30' });
      (spawnSync as jest.Mock).mockClear();

      editTemplate('todo-note');

      const calls = (spawnSync as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][1][0]).toContain('todo-note.md');
    });
  });
});
