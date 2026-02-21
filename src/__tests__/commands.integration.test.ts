import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Create a unique test directory for this run
const TEST_PARENT = path.join(os.tmpdir(), '.daily_commands_test_' + Date.now());

// Mock os.homedir before any source imports
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => TEST_PARENT,
}));

// Mock chalk to passthrough strings
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

// Mock child_process.spawnSync (used by editor)
jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 })),
}));

import { addTodo, listTodos, toggleTodo, deleteTodo, moveTodo, showTodo, editTodo } from '../commands';
import { loadTodos, saveTodos } from '../storage';

let logOutput: string[];
const originalLog = console.log;

beforeEach(() => {
  // Clean test storage
  const storageDir = path.join(TEST_PARENT, '.daily_organiser');
  if (fs.existsSync(storageDir)) {
    fs.rmSync(storageDir, { recursive: true });
  }

  // Capture console.log
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

describe('addTodo', () => {
  it('should persist a todo to the JSON file', () => {
    addTodo('Buy groceries');

    const todos = loadTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Buy groceries');
    expect(todos[0].completed).toBe(false);
    expect(todos[0].id).toBeDefined();
    expect(todos[0].createdAt).toBeInstanceOf(Date);
  });

  it('should persist a todo with due date', () => {
    addTodo('Submit report', '2025-12-01');

    const todos = loadTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].dueDate).toBeInstanceOf(Date);
    expect(todos[0].dueDate!.getFullYear()).toBe(2025);
    expect(todos[0].dueDate!.getMonth()).toBe(11);
    expect(todos[0].dueDate!.getDate()).toBe(1);
  });

  it('should show error for invalid due date', () => {
    addTodo('Bad date task', 'not-a-date');

    const todos = loadTodos();
    expect(todos).toHaveLength(0);
    expect(logOutput.some(l => l.includes('Invalid date format'))).toBe(true);
  });

  it('should insert new todos before completed ones', () => {
    addTodo('First task');
    toggleTodo('1'); // complete it
    addTodo('Second task');

    const todos = loadTodos();
    expect(todos[0].text).toBe('Second task');
    expect(todos[0].completed).toBe(false);
    expect(todos[1].text).toBe('First task');
    expect(todos[1].completed).toBe(true);
  });
});

describe('toggleTodo', () => {
  it('should mark a todo as completed and reorder', () => {
    addTodo('Task A');
    addTodo('Task B');
    toggleTodo('1'); // complete Task A

    const todos = loadTodos();
    // Task B should now be first (incomplete), Task A second (completed)
    expect(todos[0].text).toBe('Task B');
    expect(todos[0].completed).toBe(false);
    expect(todos[1].text).toBe('Task A');
    expect(todos[1].completed).toBe(true);
    expect(todos[1].completedAt).toBeInstanceOf(Date);
  });

  it('should mark a completed todo as incomplete', () => {
    addTodo('Task A');
    toggleTodo('1'); // complete
    toggleTodo('1'); // uncomplete (it's still index 1 after reorder since only 1 todo)

    const todos = loadTodos();
    expect(todos[0].text).toBe('Task A');
    expect(todos[0].completed).toBe(false);
    expect(todos[0].completedAt).toBeUndefined();
  });

  it('should show error for non-existent todo', () => {
    toggleTodo('99');
    expect(logOutput.some(l => l.includes('Todo not found'))).toBe(true);
  });
});

describe('deleteTodo', () => {
  it('should remove a todo by index', () => {
    addTodo('Task to delete');
    addTodo('Task to keep');
    deleteTodo('1');

    const todos = loadTodos();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toBe('Task to keep');
  });

  it('should show error for non-existent todo', () => {
    deleteTodo('99');
    expect(logOutput.some(l => l.includes('Todo not found'))).toBe(true);
  });
});

describe('moveTodo', () => {
  it('should move a todo to a new position', () => {
    addTodo('Task A');
    addTodo('Task B');
    addTodo('Task C');
    logOutput = []; // clear add output

    moveTodo('1', '3');

    const todos = loadTodos();
    expect(todos[0].text).toBe('Task B');
    expect(todos[1].text).toBe('Task C');
    expect(todos[2].text).toBe('Task A');
  });

  it('should move to first position', () => {
    addTodo('Task A');
    addTodo('Task B');
    addTodo('Task C');

    moveTodo('3', 'first');

    const todos = loadTodos();
    expect(todos[0].text).toBe('Task C');
    expect(todos[1].text).toBe('Task A');
    expect(todos[2].text).toBe('Task B');
  });

  it('should move to last position', () => {
    addTodo('Task A');
    addTodo('Task B');
    addTodo('Task C');

    moveTodo('1', 'last');

    const todos = loadTodos();
    expect(todos[0].text).toBe('Task B');
    expect(todos[1].text).toBe('Task C');
    expect(todos[2].text).toBe('Task A');
  });

  it('should show error for invalid positions', () => {
    addTodo('Task A');
    logOutput = [];

    moveTodo('5', '1');
    expect(logOutput.some(l => l.includes('Invalid source position'))).toBe(true);
  });
});

describe('listTodos', () => {
  it('should show empty message when no todos', () => {
    listTodos();
    expect(logOutput.some(l => l.includes('No todos yet'))).toBe(true);
  });

  it('should list all todos', () => {
    addTodo('Task A');
    addTodo('Task B');
    logOutput = [];

    listTodos();
    expect(logOutput.some(l => l.includes('Task A'))).toBe(true);
    expect(logOutput.some(l => l.includes('Task B'))).toBe(true);
  });
});

describe('showTodo', () => {
  it('should display todo details', () => {
    addTodo('Detailed task');
    logOutput = [];

    showTodo('1');
    expect(logOutput.some(l => l.includes('Detailed task'))).toBe(true);
    expect(logOutput.some(l => l.includes('Created:'))).toBe(true);
  });

  it('should show error for non-existent todo', () => {
    showTodo('99');
    expect(logOutput.some(l => l.includes('Todo not found'))).toBe(true);
  });
});

describe('editTodo — template', () => {
  it('creates note file with todo text substituted via template', () => {
    addTodo('Fix the login bug');
    editTodo('1');

    const todos = loadTodos();
    expect(todos[0].noteFile).toBeDefined();

    const noteFilePath = require('path').join(
      require('../storage').getStorageLocation(),
      todos[0].noteFile!
    );
    const content = require('fs').readFileSync(noteFilePath, 'utf-8');
    expect(content).toContain('Fix the login bug');
  });

  it('does not contain unsubstituted placeholders in created note', () => {
    addTodo('Write tests');
    editTodo('1');

    const todos = loadTodos();
    const noteFilePath = require('path').join(
      require('../storage').getStorageLocation(),
      todos[0].noteFile!
    );
    const content = require('fs').readFileSync(noteFilePath, 'utf-8');
    expect(content).not.toContain('{{title}}');
    expect(content).not.toContain('{{date}}');
    expect(content).not.toContain('{{time}}');
  });

  it('shows error for non-existent todo', () => {
    editTodo('99');
    expect(logOutput.some(l => l.includes('Todo not found'))).toBe(true);
  });
});
