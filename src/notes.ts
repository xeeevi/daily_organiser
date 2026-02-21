import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import chalk from 'chalk';
import { getStorageLocation } from './storage';
import { isEncryptionEnabled, encrypt, decrypt, isEncryptedBuffer } from './encryption';

const NOTES_DIR = path.join(getStorageLocation(), 'notes');
const TEMPLATES_DIR = path.join(getStorageLocation(), 'templates');

const DEFAULT_NOTE_TEMPLATE = `# Meeting Notes - {{date}} {{time}}

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

const DEFAULT_TODO_NOTE_TEMPLATE = `# {{title}}

## Notes

`;

export function ensureNotesDir(): void {
  if (!fs.existsSync(NOTES_DIR)) {
    fs.mkdirSync(NOTES_DIR, { recursive: true });
  }
}

function ensureTemplateDir(): void {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
  const notePath = path.join(TEMPLATES_DIR, 'note.md');
  if (!fs.existsSync(notePath)) {
    fs.writeFileSync(notePath, DEFAULT_NOTE_TEMPLATE, 'utf-8');
  }
  const todoNotePath = path.join(TEMPLATES_DIR, 'todo-note.md');
  if (!fs.existsSync(todoNotePath)) {
    fs.writeFileSync(todoNotePath, DEFAULT_TODO_NOTE_TEMPLATE, 'utf-8');
  }
}

function substituteVars(template: string, vars: { title: string; date: string; time: string }): string {
  return template
    .replace(/\{\{title\}\}/g, vars.title)
    .replace(/\{\{date\}\}/g, vars.date)
    .replace(/\{\{time\}\}/g, vars.time);
}

export function getTemplate(type: 'note' | 'todo-note', vars: { title: string; date: string; time: string }): string {
  ensureTemplateDir();
  const filename = type === 'note' ? 'note.md' : 'todo-note.md';
  const templatePath = path.join(TEMPLATES_DIR, filename);
  const raw = fs.readFileSync(templatePath, 'utf-8');
  return substituteVars(raw, vars);
}

export function editTemplate(type: 'note' | 'todo-note'): void {
  ensureTemplateDir();
  const filename = type === 'note' ? 'note.md' : 'todo-note.md';
  const templatePath = path.join(TEMPLATES_DIR, filename);
  const editor = getEditor();
  const result = spawnSync(editor, [templatePath], { stdio: 'inherit' });
  if (result.status === 0) {
    console.log(chalk.green('✓'), 'Template saved:', chalk.cyan(filename));
  } else {
    console.log(chalk.red('✗'), 'Editor exited with error');
  }
}

export function listTemplates(): void {
  ensureTemplateDir();
  console.log(chalk.bold('Note Templates:'));
  for (const name of ['note.md', 'todo-note.md']) {
    const p = path.join(TEMPLATES_DIR, name);
    const firstLine = fs.readFileSync(p, 'utf-8').split('\n')[0];
    console.log(chalk.cyan(`  ${name}`) + chalk.gray(` — ${firstLine}`));
  }
  console.log(chalk.gray('\nEdit with:'), chalk.cyan('template note'), chalk.gray('or'), chalk.cyan('template todo'));
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
 * Format time as HHMM (for filename)
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${minutes}`;
}

/**
 * Format time as HH:MM (for display/templates)
 */
function formatDisplayTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get the editor command to use
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
 * Open a note in the editor, handling encryption via temp file when needed.
 * initialContent: used when creating a new note (written to file/temp before opening).
 * Returns true on success.
 */
function openNoteInEditor(filePath: string, initialContent?: string): boolean {
  const editor = getEditor();

  if (isEncryptionEnabled()) {
    const tempPath = path.join(os.tmpdir(), `daily_note_${randomUUID()}.md`);
    try {
      let content: string;
      if (initialContent !== undefined) {
        content = initialContent;
      } else {
        const raw = fs.readFileSync(filePath);
        content = isEncryptedBuffer(raw) ? decrypt(raw).toString('utf-8') : raw.toString('utf-8');
      }
      fs.writeFileSync(tempPath, content, 'utf-8');
      const result = spawnSync(editor, [tempPath], { stdio: 'inherit' });
      if (result.status === 0) {
        const edited = fs.readFileSync(tempPath);
        fs.writeFileSync(filePath, encrypt(edited));
        return true;
      }
      return false;
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  } else {
    if (initialContent !== undefined && !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, initialContent, 'utf-8');
    }
    const result = spawnSync(editor, [filePath], { stdio: 'inherit' });
    return result.status === 0;
  }
}

/**
 * Open a new note in the user's editor
 */
export function editNote(dateOrLabel?: string): void {
  const now = new Date();
  let datePart: string;
  let timePart: string;
  let label: string | undefined;

  if (!dateOrLabel) {
    datePart = formatDate(now);
    timePart = formatTime(now);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateOrLabel)) {
    datePart = dateOrLabel;
    timePart = formatTime(now);
  } else {
    datePart = formatDate(now);
    timePart = formatTime(now);
    label = dateOrLabel;
  }

  const filePath = getNoteFilePath(datePart, timePart, label);

  let initialContent: string | undefined;
  if (!fs.existsSync(filePath)) {
    initialContent = getTemplate('note', {
      title: label ?? '',
      date: datePart,
      time: formatDisplayTime(now),
    });
  }

  const success = openNoteInEditor(filePath, initialContent);

  if (success) {
    console.log(chalk.green('✓'), 'Note saved:', chalk.cyan(path.basename(filePath)));
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
    .reverse();

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

  const index = parseInt(indexOrSearch) - 1;
  if (!isNaN(index) && index >= 0 && index < files.length) {
    return path.join(NOTES_DIR, files[index]);
  }

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

  const raw = fs.readFileSync(filePath);
  const content = isEncryptedBuffer(raw)
    ? decrypt(raw).toString('utf-8')
    : raw.toString('utf-8');
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

  const success = openNoteInEditor(filePath);

  if (success) {
    console.log(chalk.green('✓'), 'Note saved:', chalk.cyan(path.basename(filePath)));
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
