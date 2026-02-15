import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TodoStore, Todo } from './types';

// iCloud Drive path for automatic sync across Macs
const ICLOUD_DIR = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/daily_organiser'
);

// Fallback to local storage if iCloud is not available
const LOCAL_DIR = path.join(os.homedir(), '.daily_organiser');

// Determine which directory to use
function getDataDir(): string {
  const icloudParent = path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs');

  // Check if iCloud Drive is available
  if (fs.existsSync(icloudParent)) {
    return ICLOUD_DIR;
  }

  return LOCAL_DIR;
}

const DATA_DIR = getDataDir();
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getStorageLocation(): string {
  return DATA_DIR;
}

export function isUsingICloud(): boolean {
  return DATA_DIR === ICLOUD_DIR;
}

export function loadTodos(): Todo[] {
  ensureDataDir();

  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const store: TodoStore = JSON.parse(data);

    // Convert date strings back to Date objects
    return store.todos.map(todo => ({
      ...todo,
      createdAt: new Date(todo.createdAt),
      completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
      dueDate: todo.dueDate ? new Date(todo.dueDate) : undefined,
    }));
  } catch (error) {
    console.error('Error loading todos:', error);
    return [];
  }
}

export function saveTodos(todos: Todo[]): void {
  ensureDataDir();

  const store: TodoStore = { todos };

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving todos:', error);
    throw error;
  }
}
