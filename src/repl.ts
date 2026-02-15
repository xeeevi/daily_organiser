import { createInterface } from 'readline';
import chalk from 'chalk';
import { addTodo, listTodos, completeTodo, undoneTodo, deleteTodo, editTodo, showTodo, moveTodo } from './commands';
import { getStorageLocation, isUsingICloud } from './storage';
import { editNote, listNotes, showNote, deleteNote, editExistingNote } from './notes';

// Create horizontal separator line
function separator(): string {
  const width = process.stdout.columns || 80;
  return chalk.gray('─'.repeat(width));
}

export function startREPL(): void {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('daily> '),
  });

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
      switch (command) {
        case 'help':
          showHelp();
          break;

        case 'list':
        case 'ls':
          listTodos();
          break;

        case 'add':
          if (args.length === 0) {
            console.log(chalk.red('✗'), 'Please provide a task description');
          } else {
            // Check for --due flag
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

        case 'complete':
        case 'done':
          if (args.length === 0) {
            console.log(chalk.red('✗'), 'Please provide a todo number or ID');
          } else {
            completeTodo(args[0]);
          }
          break;

        case 'undone':
        case 'incomplete':
          if (args.length === 0) {
            console.log(chalk.red('✗'), 'Please provide a todo number or ID');
          } else {
            undoneTodo(args[0]);
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

        case 'show':
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

        case 'note':
        case 'notes':
        case 'n':
          // Handle note/notes/n commands with subcommands
          // Subcommands: list/ls, show, delete/rm, edit
          // If no subcommand or not a recognized subcommand, treat as editNote (create new)
          if (args[0] === 'list' || args[0] === 'ls') {
            listNotes();
          } else if (args[0] === 'show' && args[1]) {
            showNote(args[1]);
          } else if ((args[0] === 'delete' || args[0] === 'rm') && args[1]) {
            deleteNote(args[1]);
          } else if (args[0] === 'edit' && args[1]) {
            editExistingNote(args[1]);
          } else if (args[0] === 'show' && !args[1]) {
            console.log(chalk.red('✗'), 'Usage: n show <#|search>');
          } else if ((args[0] === 'delete' || args[0] === 'rm') && !args[1]) {
            console.log(chalk.red('✗'), 'Usage: n rm <#|search>');
          } else if (args[0] === 'edit' && !args[1]) {
            console.log(chalk.red('✗'), 'Usage: n edit <#|search>');
          } else {
            // Default: create new note (note, note "label", or note YYYY-MM-DD)
            editNote(args[0]);
          }
          break;

        case 'info':
          showInfo();
          break;

        case 'clear':
          console.clear();
          console.log(chalk.bold('\n📋 Daily Organiser'));
          console.log(chalk.gray('Type "help" for available commands, "exit" to quit\n'));
          listTodos();
          break;

        case 'exit':
        case 'quit':
          console.log(chalk.gray('\nGoodbye! 👋\n'));
          rl.close();
          return;

        default:
          console.log(chalk.red('✗'), `Unknown command: ${command}`);
          console.log(chalk.gray('Type "help" for available commands'));
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

function showHelp(): void {
  console.log(chalk.bold('Available Commands:'));
  console.log();
  console.log(chalk.bold('Todos:'));
  console.log(chalk.cyan('  list, ls') + '               List all todos');
  console.log(chalk.cyan('  add <text>') + '             Add a new todo');
  console.log(chalk.cyan('  add <text> --due <date>') + '  Add a todo with due date');
  console.log(chalk.cyan('  show <#>') + '               Show todo details with notes');
  console.log(chalk.cyan('  edit <#>') + '               Edit notes for a todo');
  console.log(chalk.cyan('  complete <#>, done <#>') + '   Mark todo as complete');
  console.log(chalk.cyan('  undone <#>') + '             Mark completed todo as incomplete');
  console.log(chalk.cyan('  delete <#>, rm <#>') + '      Delete a todo');
  console.log(chalk.cyan('  move <#> <#>, mv <#> <#>') + '  Reorder todos (e.g., mv 1 3, mv 2 last)');
  console.log();
  console.log(chalk.bold('Notes:'));
  console.log(chalk.cyan('  note [label], n [label]') + '  Create note with optional label');
  console.log(chalk.cyan('  note <YYYY-MM-DD>') + '       Create note for specific date');
  console.log(chalk.cyan('  n list, n ls') + '            List all notes');
  console.log(chalk.cyan('  n edit <#|search>') + '       Edit an existing note');
  console.log(chalk.cyan('  n show <#|search>') + '       Display note content');
  console.log(chalk.cyan('  n rm <#|search>') + '         Delete a note');
  console.log();
  console.log(chalk.bold('System:'));
  console.log(chalk.cyan('  info') + '                   Show storage location and sync status');
  console.log(chalk.cyan('  clear') + '                  Clear the screen');
  console.log(chalk.cyan('  help') + '                   Show this help message');
  console.log(chalk.cyan('  exit, quit') + '             Exit the program');
  console.log();
  console.log(chalk.bold('Date Formats:'));
  console.log(chalk.gray('  Date: YYYY-MM-DD or YYYYMMDD'));
  console.log(chalk.gray('  Time: HH:mm (24-hour format)'));
  console.log();
  console.log(chalk.bold('Examples:'));
  console.log(chalk.gray('  add "Review pull request"'));
  console.log(chalk.gray('  add "Team meeting" --due "2025-10-15 14:30"'));
  console.log(chalk.gray('  show 1'));
  console.log(chalk.gray('  edit 1'));
  console.log(chalk.gray('  mv 1 2          # Move todo 1 to position 2'));
  console.log(chalk.gray('  mv 3 last       # Move todo 3 to end of list'));
  console.log(chalk.gray('  n "standup"     # Create today\'s standup note'));
  console.log(chalk.gray('  n ls            # List all notes'));
  console.log(chalk.gray('  n edit 1        # Edit the first note'));
  console.log(chalk.gray('  n show 2        # Display second note'));
}
