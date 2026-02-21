import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Todo } from '../types';

// We'll test the storage functions by temporarily pointing to a test directory
const TEST_DATA_DIR = path.join(os.tmpdir(), '.daily_organiser_test_' + Date.now());
const TEST_DATA_FILE = path.join(TEST_DATA_DIR, 'todos.json');

// Mock os.homedir to point to our test directory
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: () => path.join(jest.requireActual('os').tmpdir(), '.daily_organiser_test_parent'),
}));

describe('Storage', () => {
  // Import storage functions after mocking
  let storage: any;

  beforeAll(() => {
    storage = require('../storage');
    const testParentDir = path.join(os.tmpdir(), '.daily_organiser_test_parent');
    const testDir = path.join(testParentDir, '.daily_organiser');
    storage.setActiveDataDir(testDir);
  });

  beforeEach(() => {
    // Clean up any existing test data
    const testParentDir = path.join(os.tmpdir(), '.daily_organiser_test_parent');
    const testDir = path.join(testParentDir, '.daily_organiser');
    storage.setActiveDataDir(testDir);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Final cleanup
    const testParentDir = path.join(os.tmpdir(), '.daily_organiser_test_parent');
    if (fs.existsSync(testParentDir)) {
      fs.rmSync(testParentDir, { recursive: true });
    }
  });

  describe('ensureDataDir', () => {
    it('should create data directory if it does not exist', () => {
      const testParentDir = path.join(os.tmpdir(), '.daily_organiser_test_parent');
      const testDir = path.join(testParentDir, '.daily_organiser');

      expect(fs.existsSync(testDir)).toBe(false);
      storage.ensureDataDir();
      expect(fs.existsSync(testDir)).toBe(true);
    });

    it('should not throw error if directory already exists', () => {
      storage.ensureDataDir();
      expect(() => storage.ensureDataDir()).not.toThrow();
    });
  });

  describe('loadTodos', () => {
    it('should return empty array when no file exists', () => {
      const todos = storage.loadTodos();
      expect(todos).toEqual([]);
    });

    it('should load and parse todos from file', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          text: 'Test todo',
          completed: false,
          createdAt: new Date('2025-10-11T10:00:00Z'),
        },
      ];

      // Save then load
      storage.saveTodos(testTodos);
      const todos = storage.loadTodos();

      expect(todos).toHaveLength(1);
      expect(todos[0].id).toBe('1');
      expect(todos[0].text).toBe('Test todo');
      expect(todos[0].createdAt).toBeInstanceOf(Date);
    });

    it('should handle todos with due dates', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          text: 'Test todo',
          completed: false,
          createdAt: new Date('2025-10-11T10:00:00Z'),
          dueDate: new Date('2025-10-15T14:30:00Z'),
        },
      ];

      storage.saveTodos(testTodos);
      const todos = storage.loadTodos();

      expect(todos[0].dueDate).toBeInstanceOf(Date);
      expect(todos[0].dueDate?.toISOString()).toBe('2025-10-15T14:30:00.000Z');
    });

    it('should handle completed todos with completion date', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          text: 'Test todo',
          completed: true,
          createdAt: new Date('2025-10-11T10:00:00Z'),
          completedAt: new Date('2025-10-11T11:00:00Z'),
        },
      ];

      storage.saveTodos(testTodos);
      const todos = storage.loadTodos();

      expect(todos[0].completed).toBe(true);
      expect(todos[0].completedAt).toBeInstanceOf(Date);
    });
  });

  describe('saveTodos', () => {
    it('should create data directory and save todos', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          text: 'Test todo',
          completed: false,
          createdAt: new Date('2025-10-11T10:00:00Z'),
        },
      ];

      storage.saveTodos(testTodos);
      const todos = storage.loadTodos();

      expect(todos).toHaveLength(1);
      expect(todos[0].id).toBe('1');
    });

    it('should save todos with all fields', () => {
      const testTodos: Todo[] = [
        {
          id: '1',
          text: 'Test todo',
          completed: true,
          createdAt: new Date('2025-10-11T10:00:00Z'),
          completedAt: new Date('2025-10-11T11:00:00Z'),
          dueDate: new Date('2025-10-15T14:30:00Z'),
        },
      ];

      storage.saveTodos(testTodos);
      const todos = storage.loadTodos();

      expect(todos[0]).toHaveProperty('completedAt');
      expect(todos[0]).toHaveProperty('dueDate');
      expect(todos[0].completedAt).toBeInstanceOf(Date);
      expect(todos[0].dueDate).toBeInstanceOf(Date);
    });
  });
});
