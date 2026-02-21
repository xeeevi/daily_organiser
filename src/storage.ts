import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TodoStore, Todo } from './types';
import { isEncryptionEnabled, encrypt, decrypt, isEncryptedBuffer } from './encryption';

// iCloud Drive path for automatic sync across Macs
function iCloudRoot(): string {
  return path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs');
}

// Determine which root directory to use for the app
export function getDataDir(): string {
  const icloudParent = iCloudRoot();
  if (fs.existsSync(icloudParent)) {
    return path.join(icloudParent, 'daily_organiser');
  }
  return path.join(os.homedir(), '.daily_organiser');
}

let activeDataDir = '';

export function setActiveDataDir(dir: string): void {
  activeDataDir = dir;
}

export function _resetStorageForTest(): void {
  activeDataDir = '';
}

export function getStorageLocation(): string {
  if (!activeDataDir) throw new Error('Storage not initialized. Call setActiveDataDir first.');
  return activeDataDir;
}

function getDataFile(): string {
  return path.join(getStorageLocation(), 'todos.json');
}

export function ensureDataDir(): void {
  const dir = getStorageLocation();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function isUsingICloud(): boolean {
  return activeDataDir.startsWith(iCloudRoot());
}

export function loadTodos(): Todo[] {
  ensureDataDir();

  const dataFile = getDataFile();
  if (!fs.existsSync(dataFile)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(dataFile);
    const data = isEncryptedBuffer(raw) ? decrypt(raw).toString('utf-8') : raw.toString('utf-8');
    const store: TodoStore = JSON.parse(data);

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
    const json = JSON.stringify(store, null, 2);
    const dir = getStorageLocation();
    const output = isEncryptionEnabled(dir) ? encrypt(Buffer.from(json, 'utf-8')) : Buffer.from(json, 'utf-8');
    fs.writeFileSync(getDataFile(), output);
  } catch (error) {
    console.error('Error saving todos:', error);
    throw error;
  }
}
