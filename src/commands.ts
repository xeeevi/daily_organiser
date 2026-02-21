import { Todo } from './types';
import { loadTodos, saveTodos, getStorageLocation } from './storage';
import chalk from 'chalk';
import { randomUUID } from 'crypto';
import { parseDueDate, formatDueDate } from './dateParser';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { isEncryptionEnabled, encrypt, decrypt, isEncryptedBuffer } from './encryption';
import { getTemplate } from './notes';

export function addTodo(text: string, dueDate?: string): void {
  const todos = loadTodos();

  let parsedDueDate: Date | undefined;

  if (dueDate) {
    parsedDueDate = parseDueDate(dueDate) || undefined;
    if (!parsedDueDate) {
      console.log(chalk.red('✗'), 'Invalid date format. Use YYYY-MM-DD or YYYYMMDD, optionally with HH:mm');
      return;
    }
  }

  const newTodo: Todo = {
    id: randomUUID(),
    text,
    completed: false,
    createdAt: new Date(),
    dueDate: parsedDueDate,
  };

  // Find the first completed todo position
  const firstCompletedIndex = todos.findIndex(t => t.completed);

  // Insert at the end of non-completed tasks:
  // - If there are completed todos, insert just before the first one
  // - If no completed todos exist, insert at the end
  if (firstCompletedIndex !== -1) {
    todos.splice(firstCompletedIndex, 0, newTodo);
  } else {
    todos.push(newTodo);
  }

  saveTodos(todos);

  console.log(chalk.green('✓'), 'Added todo:', chalk.bold(text));
  if (parsedDueDate) {
    console.log(chalk.gray('  Due:'), chalk.cyan(formatDueDate(parsedDueDate)));
  }
}

export function listTodos(): void {
  const todos = loadTodos();

  if (todos.length === 0) {
    console.log(chalk.gray('No todos yet. Add one with:'), chalk.cyan('add "Your task"'));
    return;
  }

  console.log(chalk.bold('Your Todos:'));

  todos.forEach((todo, index) => {
    const checkbox = todo.completed ? chalk.green('✓') : chalk.gray('○');
    const text = todo.completed ? chalk.gray.strikethrough(todo.text) : chalk.white(todo.text);
    const number = chalk.gray(`${index + 1}.`);

    console.log(`${number} ${checkbox} ${text}`);

    if (todo.dueDate && !todo.completed) {
      const now = new Date();
      const isPast = todo.dueDate < now;
      const formattedDate = formatDueDate(todo.dueDate);
      const dueText = isPast
        ? chalk.red(`  ⚠ Overdue: ${formattedDate}`)
        : chalk.cyan(`  Due: ${formattedDate}`);
      console.log(dueText);
    }

    if (todo.completedAt) {
      console.log(chalk.gray(`  Completed: ${todo.completedAt.toLocaleString()}`));
    }
  });
}

export function completeTodo(indexOrId: string): void {
  const todos = loadTodos();

  // Try to find by index first
  const index = parseInt(indexOrId) - 1;
  let todoIndex: number = -1;
  let todo: Todo | undefined;

  if (!isNaN(index) && index >= 0 && index < todos.length) {
    todo = todos[index];
    todoIndex = index;
  } else {
    // Try to find by ID
    todoIndex = todos.findIndex(t => t.id === indexOrId);
    if (todoIndex !== -1) {
      todo = todos[todoIndex];
    }
  }

  if (!todo) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  todo.completed = true;
  todo.completedAt = new Date();

  // Reorder: move completed todo to the first position among completed todos
  // 1. Remove the todo from its current position
  todos.splice(todoIndex, 1);

  // 2. Find the first completed todo position (or end of list if none)
  const firstCompletedIndex = todos.findIndex(t => t.completed);

  // 3. Insert at the right position:
  //    - If there are completed todos, insert at that position (becomes first completed)
  //    - If no completed todos exist, insert at the end
  if (firstCompletedIndex !== -1) {
    todos.splice(firstCompletedIndex, 0, todo);
  } else {
    todos.push(todo);
  }

  saveTodos(todos);

  console.log(chalk.green('✓'), 'Completed:', chalk.strikethrough(todo.text));
}

export function toggleTodo(indexOrId: string): void {
  const todos = loadTodos();

  const index = parseInt(indexOrId) - 1;
  let todo: Todo | undefined;

  if (!isNaN(index) && index >= 0 && index < todos.length) {
    todo = todos[index];
  } else {
    todo = todos.find(t => t.id === indexOrId);
  }

  if (!todo) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  if (todo.completed) {
    undoneTodo(indexOrId);
  } else {
    completeTodo(indexOrId);
  }
}

export function undoneTodo(indexOrId: string): void {
  const todos = loadTodos();

  // Try to find by index first
  const index = parseInt(indexOrId) - 1;
  let todoIndex: number = -1;
  let todo: Todo | undefined;

  if (!isNaN(index) && index >= 0 && index < todos.length) {
    todo = todos[index];
    todoIndex = index;
  } else {
    // Try to find by ID
    todoIndex = todos.findIndex(t => t.id === indexOrId);
    if (todoIndex !== -1) {
      todo = todos[todoIndex];
    }
  }

  if (!todo) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  if (!todo.completed) {
    console.log(chalk.yellow('⚠'), 'Todo is not completed');
    return;
  }

  todo.completed = false;
  todo.completedAt = undefined;

  // Reorder: move uncompleted todo to the end of non-completed todos
  // 1. Remove the todo from its current position
  todos.splice(todoIndex, 1);

  // 2. Find the first completed todo position (or end of list if none)
  const firstCompletedIndex = todos.findIndex(t => t.completed);

  // 3. Insert at the right position:
  //    - If there are completed todos, insert just before the first one
  //    - If no completed todos exist, insert at the end
  if (firstCompletedIndex !== -1) {
    todos.splice(firstCompletedIndex, 0, todo);
  } else {
    todos.push(todo);
  }

  saveTodos(todos);

  console.log(chalk.green('✓'), 'Marked as incomplete:', chalk.white(todo.text));
}

export function deleteTodo(indexOrId: string): void {
  const todos = loadTodos();

  // Try to find by index first
  const index = parseInt(indexOrId) - 1;
  let todoIndex: number = -1;

  if (!isNaN(index) && index >= 0 && index < todos.length) {
    todoIndex = index;
  } else {
    // Try to find by ID
    todoIndex = todos.findIndex(t => t.id === indexOrId);
  }

  if (todoIndex === -1) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  const deletedTodo = todos.splice(todoIndex, 1)[0];

  // Delete linked note file if it exists
  if (deletedTodo.noteFile) {
    const noteFilePath = join(getStorageLocation(), deletedTodo.noteFile);
    if (existsSync(noteFilePath)) {
      unlinkSync(noteFilePath);
    }
  }

  saveTodos(todos);

  console.log(chalk.green('✓'), 'Deleted:', chalk.gray(deletedTodo.text));
}

/**
 * Helper: Ensure the todos notes directory exists
 */
function ensureTodoNotesDir(): string {
  const notesDir = join(getStorageLocation(), 'notes', 'todos');
  if (!existsSync(notesDir)) {
    mkdirSync(notesDir, { recursive: true });
  }
  return notesDir;
}

/**
 * Helper: Get the editor command to use
 */
function getEditor(): string {
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }

  const vimCheck = spawnSync('which', ['vim'], { encoding: 'utf-8' });
  if (vimCheck.status === 0) {
    return 'vim';
  }

  return 'nano';
}

/**
 * Helper: Find todo by index or ID
 */
function findTodo(indexOrId: string): { todo: Todo; index: number } | null {
  const todos = loadTodos();

  const index = parseInt(indexOrId) - 1;
  if (!isNaN(index) && index >= 0 && index < todos.length) {
    return { todo: todos[index], index };
  }

  const foundIndex = todos.findIndex(t => t.id === indexOrId);
  if (foundIndex !== -1) {
    return { todo: todos[foundIndex], index: foundIndex };
  }

  return null;
}

/**
 * Edit the note linked to a todo
 */
export function editTodo(indexOrId: string): void {
  const result = findTodo(indexOrId);

  if (!result) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  const { todo, index } = result;
  const todos = loadTodos();

  // Assign note file path if not yet set
  if (!todo.noteFile) {
    ensureTodoNotesDir();
    todo.noteFile = join('notes', 'todos', `todo-${todo.id}.md`);
    todos[index].noteFile = todo.noteFile;
  }

  const noteFilePath = join(getStorageLocation(), todo.noteFile);
  const editor = getEditor();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Build initial template content when the note file doesn't exist yet
  const isNew = !existsSync(noteFilePath);
  const initialTemplate = isNew
    ? getTemplate('todo-note', { title: todo.text, date: dateStr, time: timeStr })
    : undefined;

  if (isEncryptionEnabled(getStorageLocation())) {
    const tempPath = join(tmpdir(), `daily_note_${randomUUID()}.md`);
    try {
      let content: string;
      if (initialTemplate !== undefined) {
        content = initialTemplate;
      } else {
        const raw = readFileSync(noteFilePath);
        content = isEncryptedBuffer(raw) ? decrypt(raw).toString('utf-8') : raw.toString('utf-8');
      }
      writeFileSync(tempPath, content, 'utf-8');

      const editorResult = spawnSync(editor, [tempPath], { stdio: 'inherit' });

      if (editorResult.status === 0) {
        const edited = readFileSync(tempPath, 'utf-8');
        if (edited.trim().length > 0) {
          writeFileSync(noteFilePath, encrypt(Buffer.from(edited, 'utf-8')));
          saveTodos(todos);
          console.log(chalk.green('✓'), 'Note saved for todo:', chalk.cyan(todo.text));
        } else {
          if (existsSync(noteFilePath)) unlinkSync(noteFilePath);
          todos[index].noteFile = undefined;
          saveTodos(todos);
          console.log(chalk.gray('Note was empty, not saved'));
        }
      } else {
        console.log(chalk.red('✗'), 'Editor exited with error');
      }
    } finally {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    }
  } else {
    if (initialTemplate !== undefined) {
      writeFileSync(noteFilePath, initialTemplate, 'utf-8');
    }

    const editorResult = spawnSync(editor, [noteFilePath], { stdio: 'inherit' });

    if (editorResult.status === 0) {
      const content = readFileSync(noteFilePath, 'utf-8').trim();
      if (content.length > 0) {
        saveTodos(todos);
        console.log(chalk.green('✓'), 'Note saved for todo:', chalk.cyan(todo.text));
      } else {
        unlinkSync(noteFilePath);
        todos[index].noteFile = undefined;
        saveTodos(todos);
        console.log(chalk.gray('Note was empty, not saved'));
      }
    } else {
      console.log(chalk.red('✗'), 'Editor exited with error');
    }
  }
}

/**
 * Move a todo to a new position in the list
 */
export function moveTodo(fromPos: string, toPos: string): void {
  const todos = loadTodos();

  if (todos.length === 0) {
    console.log(chalk.red('✗'), 'No todos to move');
    return;
  }

  // Parse from position (1-based index)
  const fromIndex = parseInt(fromPos) - 1;
  if (isNaN(fromIndex) || fromIndex < 0 || fromIndex >= todos.length) {
    console.log(chalk.red('✗'), `Invalid source position: ${fromPos}`);
    return;
  }

  // Parse to position (1-based index or 'last'/'first')
  let toIndex: number;

  if (toPos.toLowerCase() === 'last') {
    toIndex = todos.length - 1;
  } else if (toPos.toLowerCase() === 'first') {
    toIndex = 0;
  } else {
    toIndex = parseInt(toPos) - 1;
    if (isNaN(toIndex) || toIndex < 0 || toIndex >= todos.length) {
      console.log(chalk.red('✗'), `Invalid destination position: ${toPos}`);
      return;
    }
  }

  // No-op if moving to same position
  if (fromIndex === toIndex) {
    console.log(chalk.gray('Todo is already at position'), chalk.cyan(fromPos));
    return;
  }

  // Extract the todo to move
  const [movedTodo] = todos.splice(fromIndex, 1);

  // Insert at new position
  todos.splice(toIndex, 0, movedTodo);

  // Save the reordered list
  saveTodos(todos);

  console.log(
    chalk.green('✓'),
    'Moved',
    chalk.cyan(movedTodo.text),
    'from position',
    chalk.bold(fromPos),
    'to',
    chalk.bold((toIndex + 1).toString())
  );
  console.log(); // Add blank line before list

  // Show updated list
  listTodos();
}

/**
 * Show a todo with its note content
 */
export function showTodo(indexOrId: string): void {
  const result = findTodo(indexOrId);

  if (!result) {
    console.log(chalk.red('✗'), 'Todo not found');
    return;
  }

  const { todo, index } = result;

  // Display todo info
  console.log(chalk.bold(`\n[${index + 1}] ${todo.text}`));
  console.log(chalk.gray('Created:'), todo.createdAt.toLocaleString());

  if (todo.dueDate) {
    const now = new Date();
    const isPast = todo.dueDate < now;
    const formattedDate = formatDueDate(todo.dueDate);
    if (isPast) {
      console.log(chalk.red('⚠ Overdue:'), formattedDate);
    } else {
      console.log(chalk.cyan('Due:'), formattedDate);
    }
  }

  if (todo.completed && todo.completedAt) {
    console.log(chalk.green('✓ Completed:'), todo.completedAt.toLocaleString());
  }

  // Display note content if it exists
  if (todo.noteFile) {
    const noteFilePath = join(getStorageLocation(), todo.noteFile);
    if (existsSync(noteFilePath)) {
      const content = readFileSync(noteFilePath, 'utf-8');
      console.log(chalk.bold('\nNotes:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(content);
      console.log(chalk.gray('─'.repeat(50)));
    }
  } else {
    console.log(chalk.gray('\nNo notes yet. Use'), chalk.cyan(`edit ${index + 1}`), chalk.gray('to add notes.'));
  }

  console.log();
}
