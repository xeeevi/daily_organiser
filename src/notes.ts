import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import chalk from 'chalk';
import { getStorageLocation } from './storage';

const NOTES_DIR = path.join(getStorageLocation(), 'notes');

export function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

/**
 * Get the path for a note file
 */
function getNoteFilePath(dateStr: string, timeStr: string, label?: string): string {
  ensureNotesDir();
  const filename = label ? `${dateStr}-${timeStr}-${label}.md` : `${dateStr}-${timeStr}.md`;
  return path.join(NOTES_DIR, filename);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HHMM
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Get the editor command to use
 */
function getEditor(): string {
  // Check environment variable first
  if (process.env.EDITOR) {
    return process.env.EDITOR;
  }

  // Check if vim is available
  const vimCheck = spawnSync('which', ['vim'], { encoding: 'utf-8' });
  if (vimCheck.status === 0) {
    return 'vim';
  }

  // Fall back to nano
  return 'nano';
}

/**
 * Open a note in the user's editor
 */
export function editNote(dateOrLabel?: string): void {
  const now = new Date();
  let datePart: string;
  let timePart: string;
  let label: string | undefined;

  if (!dateOrLabel) {
    // No argument - use current date and time
    datePart = formatDate(now);
    timePart = formatTime(now);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrLabel)) {
    // Argument is a date - use current time
    datePart = dateOrLabel;
    timePart = formatTime(now);
  } else {
    // Argument is a label - use current date and time with label
    datePart = formatDate(now);
    timePart = formatTime(now);
    label = dateOrLabel;
  }

  const filePath = getNoteFilePath(datePart, timePart, label);
  const editor = getEditor();

  // Create initial template if file doesn't exist
  if (!fs.existsSync(filePath)) {
    const template = `# Meeting Notes - ${datePart} ${timePart.substring(0,2)}:${timePart.substring(2)}${label ? ` (${label})` : ''}

## Attendees
-

## Agenda
-

## Discussion
-

## Action Items
- [ ]

## Next Steps
-
`;
    fs.writeFileSync(filePath, template, 'utf-8');
  }

  // Spawn editor and wait for it to close
  const result = spawnSync(editor, [filePath], {
    stdio: 'inherit', // This allows the editor to take over the terminal
  });

  if (result.status === 0) {
    const displayName = path.basename(filePath);
    console.log(chalk.green('✓'), 'Note saved:', chalk.cyan(displayName));
  } else {
    console.log(chalk.red('✗'), 'Editor exited with error');
  }
}

/**
 * List all notes with numbers
 */
export function listNotes(): void {
  ensureNotesDir();

  const files = fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // Most recent first

  if (files.length === 0) {
    console.log(chalk.gray('No notes yet. Create one with:'), chalk.cyan('note'));
    return;
  }

  console.log(chalk.bold('Meeting Notes:'));
  files.forEach((file, index) => {
    const filePath = path.join(NOTES_DIR, file);
    const stats = fs.statSync(filePath);
    const modified = stats.mtime.toLocaleDateString();
    console.log(chalk.gray(`${index + 1}.`) + ' ' + chalk.cyan(file) + chalk.gray(` (modified: ${modified})`));
  });
}

/**
 * Get note file by index or search term
 */
function findNoteFile(indexOrSearch: string): string | null {
  ensureNotesDir();

  const files = fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();

  // Try as index first
  const index = parseInt(indexOrSearch) - 1;
  if (!isNaN(index) && index >= 0 && index < files.length) {
    return path.join(NOTES_DIR, files[index]);
  }

  // Try to find by search term
  const matchingFile = files.find(f => f.includes(indexOrSearch));
  if (matchingFile) {
    return path.join(NOTES_DIR, matchingFile);
  }

  return null;
}

/**
 * Show note content (read-only)
 */
export function showNote(indexOrSearch: string): void {
  const filePath = findNoteFile(indexOrSearch);

  if (!filePath) {
    console.log(chalk.red('✗'), 'Note not found:', indexOrSearch);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(content);
}

/**
 * Edit an existing note by index or search term
 */
export function editExistingNote(indexOrSearch: string): void {
  const filePath = findNoteFile(indexOrSearch);

  if (!filePath) {
    console.log(chalk.red('✗'), 'Note not found:', indexOrSearch);
    return;
  }

  const editor = getEditor();

  // Spawn editor and wait for it to close
  const result = spawnSync(editor, [filePath], {
    stdio: 'inherit',
  });

  if (result.status === 0) {
    const displayName = path.basename(filePath);
    console.log(chalk.green('✓'), 'Note saved:', chalk.cyan(displayName));
  } else {
    console.log(chalk.red('✗'), 'Editor exited with error');
  }
}

/**
 * Delete a note by index or search term
 */
export function deleteNote(indexOrSearch: string): void {
  const filePath = findNoteFile(indexOrSearch);

  if (!filePath) {
    console.log(chalk.red('✗'), 'Note not found:', indexOrSearch);
    return;
  }

  fs.unlinkSync(filePath);
  console.log(chalk.green('✓'), 'Note deleted:', chalk.cyan(path.basename(filePath)));
}
