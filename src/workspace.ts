import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Workspace, WorkspaceRegistry } from './types';

export function getWorkspacesRoot(root: string): string {
  return path.join(root, 'workspaces');
}

export function getWorkspaceDir(root: string, name: string): string {
  return path.join(getWorkspacesRoot(root), name);
}

function registryPath(root: string): string {
  return path.join(root, 'workspaces.json');
}

export function loadRegistry(root: string): WorkspaceRegistry {
  const p = registryPath(root);
  if (!fs.existsSync(p)) {
    throw new Error('No workspace registry found');
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function saveRegistry(root: string, registry: WorkspaceRegistry): void {
  fs.writeFileSync(registryPath(root), JSON.stringify(registry, null, 2), 'utf-8');
}

export function listWorkspaces(root: string): Workspace[] {
  if (!fs.existsSync(registryPath(root))) return [];
  return loadRegistry(root).workspaces;
}

export function workspaceExists(root: string, name: string): boolean {
  return listWorkspaces(root).some(w => w.name === name);
}

export function createWorkspace(root: string, name: string): void {
  const wsDir = getWorkspaceDir(root, name);
  ensureWorkspaceDir(wsDir);

  const p = registryPath(root);
  let registry: WorkspaceRegistry;
  if (fs.existsSync(p)) {
    registry = loadRegistry(root);
    if (!registry.workspaces.some(w => w.name === name)) {
      registry.workspaces.push({ name, createdAt: new Date().toISOString() });
    }
  } else {
    registry = {
      workspaces: [{ name, createdAt: new Date().toISOString() }],
      defaultWorkspace: name,
    };
  }
  saveRegistry(root, registry);
}

export function setDefaultWorkspace(root: string, name: string): void {
  const registry = loadRegistry(root);
  registry.defaultWorkspace = name;
  saveRegistry(root, registry);
}

export function getDefaultWorkspace(root: string): string {
  return loadRegistry(root).defaultWorkspace;
}

export function ensureWorkspaceDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function migrateLegacyData(root: string, name: string): void {
  const wsDir = getWorkspaceDir(root, name);
  ensureWorkspaceDir(wsDir);

  for (const item of ['todos.json', 'notes', 'templates', '.encrypted', '.salt']) {
    const src = path.join(root, item);
    if (fs.existsSync(src)) {
      fs.renameSync(src, path.join(wsDir, item));
    }
  }
}

export function validateWorkspaceName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{1,50}$/.test(name);
}

export function promptWorkspaceName(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function resolveActiveWorkspace(root: string, cliArg?: string): Promise<string> {
  const regPath = registryPath(root);

  if (cliArg) {
    if (!workspaceExists(root, cliArg)) {
      console.error(`Workspace "${cliArg}" does not exist`);
      process.exit(1);
    }
    return cliArg;
  }

  if (!fs.existsSync(regPath)) {
    const legacyTodos = path.join(root, 'todos.json');
    if (fs.existsSync(legacyTodos)) {
      console.log('\nExisting data detected. Please name your workspace to migrate it:');
      let name = '';
      while (!validateWorkspaceName(name)) {
        name = await promptWorkspaceName('Workspace name: ');
        if (!validateWorkspaceName(name)) {
          console.log('Invalid name. Use letters, numbers, _ or - (1-50 chars)');
        }
      }
      migrateLegacyData(root, name);
      const registry: WorkspaceRegistry = {
        workspaces: [{ name, createdAt: new Date().toISOString() }],
        defaultWorkspace: name,
      };
      saveRegistry(root, registry);
      return name;
    } else {
      console.log('\nWelcome to Daily Organiser! Create your first workspace:');
      let name = '';
      while (!validateWorkspaceName(name)) {
        name = await promptWorkspaceName('Workspace name: ');
        if (!validateWorkspaceName(name)) {
          console.log('Invalid name. Use letters, numbers, _ or - (1-50 chars)');
        }
      }
      createWorkspace(root, name);
      return name;
    }
  }

  return getDefaultWorkspace(root);
}
