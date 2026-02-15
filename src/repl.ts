import { createInterface } from 'readline';
import chalk from 'chalk';
import { addTodo, listTodos, toggleTodo, deleteTodo, editTodo, showTodo, moveTodo } from './commands';
import { getStorageLocation, isUsingICloud } from './storage';
import { editNote, listNotes, showNote, deleteNote, editExistingNote } from './notes';
import { Mode } from './types';

// Create horizontal separator line
function separator(): string {
  const width = process.stdout.columns || 80;
  return chalk.gray('─'.repeat(width));
}

export function startREPL(): void {
  let currentMode: Mode = 'todo';

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan(`daily:${currentMode}> `),
  });

  function updatePrompt(): void {
    rl.setPrompt(chalk.cyan(`daily:${currentMode}> `));
  }

  // Display welcome message
  console.log(chalk.bold('\n📋 Daily Organiser'));
  console.log(chalk.gray('Type "help" for available commands, "exit" to quit\n'));

  // Show initial todo list
  listTodos();

  // Show first separator before prompt
  console.log(separator());
  rl.prompt();

  rl.on('line', (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Parse command and arguments
    const parts = parseCommand(input);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      // Shared commands (work in both modes)
      if (handleSharedCommand(command, args, rl, currentMode)) {
        // handled
      } else if (command === 'todo') {
        currentMode = 'todo';
        updatePrompt();
        console.log(chalk.gray('Switched to'), chalk.bold('todo'), chalk.gray('mode'));
        console.log();
        listTodos();
      } else if (command === 'notes' || command === 'n') {
        currentMode = 'notes';
        updatePrompt();
        console.log(chalk.gray('Switched to'), chalk.bold('notes'), chalk.gray('mode'));
        console.log();
        listNotes();
      } else if (currentMode === 'todo') {
        handleTodoCommand(command, args);
      } else {
        handleNotesCommand(command, args);
      }
    } catch (error) {
      console.log(chalk.red('✗'), 'Error:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Show separator and prompt
    console.log(separator());
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Handle shared commands that work in both modes.
 * Returns true if the command was handled.
 */
function handleSharedCommand(command: string, _args: string[], rl: ReturnType<typeof createInterface>, currentMode: Mode): boolean {
  switch (command) {
    case 'help':
      showHelp(currentMode);
      return true;

    case 'info':
      showInfo();
      return true;

    case 'clear':
      console.clear();
      console.log(chalk.bold('\n📋 Daily Organiser'));
      console.log(chalk.gray('Type "help" for available commands, "exit" to quit\n'));
      return true;

    case 'exit':
    case 'quit':
      console.log(chalk.gray('\nGoodbye! 👋\n'));
      rl.close();
      return true;

    default:
      return false;
  }
}

function handleTodoCommand(command: string, args: string[]): void {
  switch (command) {
    case 'list':
    case 'ls':
      listTodos();
      break;

    case 'add':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Please provide a task description');
      } else {
        const dueIndex = args.findIndex(arg => arg === '--due' || arg === '-d');
        let text: string;
        let dueDate: string | undefined;

        if (dueIndex !== -1 && args[dueIndex + 1]) {
          text = args.slice(0, dueIndex).join(' ');
          dueDate = args[dueIndex + 1];
        } else {
          text = args.join(' ');
        }

        addTodo(text, dueDate);
      }
      break;

    case 'toggle':
    case 'done':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Please provide a todo number or ID');
      } else {
        toggleTodo(args[0]);
      }
      break;

    case 'delete':
    case 'rm':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Please provide a todo number or ID');
      } else {
        deleteTodo(args[0]);
      }
      break;

    case 'edit':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Please provide a todo number or ID');
      } else {
        editTodo(args[0]);
      }
      break;

    case 'cat':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Please provide a todo number or ID');
      } else {
        showTodo(args[0]);
      }
      break;

    case 'move':
    case 'mv':
      if (args.length < 2) {
        console.log(chalk.red('✗'), 'Usage: move <from> <to>');
        console.log(chalk.gray('Examples: mv 1 2, mv 3 last, mv 5 first'));
      } else {
        moveTodo(args[0], args[1]);
      }
      break;

    default:
      console.log(chalk.red('✗'), `Unknown command: ${command}`);
      console.log(chalk.gray('Type "help" for available commands'));
  }
}

function handleNotesCommand(command: string, args: string[]): void {
  switch (command) {
    case 'add':
      editNote(args[0]);
      break;

    case 'list':
    case 'ls':
      listNotes();
      break;

    case 'cat':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Usage: cat <#|search>');
      } else {
        showNote(args[0]);
      }
      break;

    case 'edit':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Usage: edit <#|search>');
      } else {
        editExistingNote(args[0]);
      }
      break;

    case 'delete':
    case 'rm':
      if (args.length === 0) {
        console.log(chalk.red('✗'), 'Usage: rm <#|search>');
      } else {
        deleteNote(args[0]);
      }
      break;

    default:
      console.log(chalk.red('✗'), `Unknown command: ${command}`);
      console.log(chalk.gray('Type "help" for available commands'));
  }
}

function parseCommand(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current) {
        parts.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function showInfo(): void {
  const location = getStorageLocation();
  const usingICloud = isUsingICloud();

  console.log(chalk.bold('Storage Information:'));
  console.log(chalk.gray('Location:'), chalk.cyan(location));
  console.log(chalk.gray('Sync:    '), usingICloud ? chalk.green('✓ iCloud Drive (auto-sync enabled)') : chalk.yellow('⚠ Local only (iCloud not available)'));

  if (usingICloud) {
    console.log(chalk.gray('Your todos are automatically synced across all your Macs via iCloud.'));
  }
}

function showHelp(currentMode: Mode): void {
  if (currentMode === 'notes') {
    showNotesHelp();
  } else {
    showTodoHelp();
  }
}

function showTodoHelp(): void {
  console.log(chalk.bold('Todo Commands:'));
  console.log(chalk.cyan('  list, ls') + '               List all todos');
  console.log(chalk.cyan('  add <text>') + '             Add a new todo');
  console.log(chalk.cyan('  add <text> --due <date>') + '  Add a todo with due date');
  console.log(chalk.cyan('  cat <#>') + '                Show todo details with notes');
  console.log(chalk.cyan('  edit <#>') + '               Edit notes for a todo');
  console.log(chalk.cyan('  toggle <#>, done <#>') + '    Toggle todo completion');
  console.log(chalk.cyan('  delete <#>, rm <#>') + '      Delete a todo');
  console.log(chalk.cyan('  move <#> <#>, mv <#> <#>') + '  Reorder todos');
  console.log();
  showSharedHelp();
}

function showNotesHelp(): void {
  console.log(chalk.bold('Notes Commands:'));
  console.log(chalk.cyan('  add [label|date]') + '       Create a new note');
  console.log(chalk.cyan('  list, ls') + '               List all notes');
  console.log(chalk.cyan('  cat <#|search>') + '         Display note content');
  console.log(chalk.cyan('  edit <#|search>') + '        Edit an existing note');
  console.log(chalk.cyan('  delete <#>, rm <#>') + '      Delete a note');
  console.log();
  showSharedHelp();
}

function showSharedHelp(): void {
  console.log(chalk.bold('Switch Mode:'));
  console.log(chalk.cyan('  todo') + '                   Switch to todo mode');
  console.log(chalk.cyan('  notes') + '                  Switch to notes mode');
  console.log();
  console.log(chalk.bold('System:'));
  console.log(chalk.cyan('  info') + '                   Show storage location and sync status');
  console.log(chalk.cyan('  clear') + '                  Clear the screen');
  console.log(chalk.cyan('  help') + '                   Show this help message');
  console.log(chalk.cyan('  exit, quit') + '             Exit the program');
}
