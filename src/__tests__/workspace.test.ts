import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_ROOT = path.join(os.tmpdir(), '.daily_ws_test_' + Date.now());

beforeAll(() => {
  fs.mkdirSync(TEST_ROOT, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
});

beforeEach(() => {
  // Clean root between tests
  for (const item of fs.readdirSync(TEST_ROOT)) {
    fs.rmSync(path.join(TEST_ROOT, item), { recursive: true, force: true });
  }
});

import {
  getWorkspacesRoot,
  getWorkspaceDir,
  loadRegistry,
  saveRegistry,
  listWorkspaces,
  workspaceExists,
  createWorkspace,
  setDefaultWorkspace,
  getDefaultWorkspace,
  ensureWorkspaceDir,
  migrateLegacyData,
  validateWorkspaceName,
  resolveActiveWorkspace,
} from '../workspace';

describe('validateWorkspaceName', () => {
  it('accepts valid names', () => {
    expect(validateWorkspaceName('work')).toBe(true);
    expect(validateWorkspaceName('my-project')).toBe(true);
    expect(validateWorkspaceName('my_project')).toBe(true);
    expect(validateWorkspaceName('Project123')).toBe(true);
    expect(validateWorkspaceName('a'.repeat(50))).toBe(true);
  });

  it('rejects invalid names', () => {
    expect(validateWorkspaceName('')).toBe(false);
    expect(validateWorkspaceName('has space')).toBe(false);
    expect(validateWorkspaceName('has.dot')).toBe(false);
    expect(validateWorkspaceName('has/slash')).toBe(false);
    expect(validateWorkspaceName('a'.repeat(51))).toBe(false);
  });
});

describe('getWorkspacesRoot / getWorkspaceDir', () => {
  it('returns correct workspaces root', () => {
    expect(getWorkspacesRoot(TEST_ROOT)).toBe(path.join(TEST_ROOT, 'workspaces'));
  });

  it('returns correct workspace dir', () => {
    expect(getWorkspaceDir(TEST_ROOT, 'myws')).toBe(path.join(TEST_ROOT, 'workspaces', 'myws'));
  });
});

describe('createWorkspace', () => {
  it('creates workspace directory', () => {
    createWorkspace(TEST_ROOT, 'alpha');
    expect(fs.existsSync(getWorkspaceDir(TEST_ROOT, 'alpha'))).toBe(true);
  });

  it('creates workspaces.json registry', () => {
    createWorkspace(TEST_ROOT, 'beta');
    const reg = loadRegistry(TEST_ROOT);
    expect(reg.workspaces.some(w => w.name === 'beta')).toBe(true);
    expect(reg.defaultWorkspace).toBe('beta');
  });

  it('adds to existing registry without overwriting', () => {
    createWorkspace(TEST_ROOT, 'ws1');
    createWorkspace(TEST_ROOT, 'ws2');
    const reg = loadRegistry(TEST_ROOT);
    expect(reg.workspaces).toHaveLength(2);
    expect(reg.workspaces.map(w => w.name)).toContain('ws1');
    expect(reg.workspaces.map(w => w.name)).toContain('ws2');
  });

  it('is idempotent (calling twice does not duplicate)', () => {
    createWorkspace(TEST_ROOT, 'dup');
    createWorkspace(TEST_ROOT, 'dup');
    const reg = loadRegistry(TEST_ROOT);
    const count = reg.workspaces.filter(w => w.name === 'dup').length;
    expect(count).toBe(1);
  });
});

describe('workspaceExists', () => {
  it('returns false when workspace does not exist', () => {
    expect(workspaceExists(TEST_ROOT, 'nonexistent')).toBe(false);
  });

  it('returns true after workspace is created', () => {
    createWorkspace(TEST_ROOT, 'exists');
    expect(workspaceExists(TEST_ROOT, 'exists')).toBe(true);
  });
});

describe('listWorkspaces', () => {
  it('returns empty array when no registry', () => {
    expect(listWorkspaces(TEST_ROOT)).toEqual([]);
  });

  it('returns all workspaces', () => {
    createWorkspace(TEST_ROOT, 'a');
    createWorkspace(TEST_ROOT, 'b');
    const ws = listWorkspaces(TEST_ROOT);
    expect(ws).toHaveLength(2);
  });
});

describe('setDefaultWorkspace / getDefaultWorkspace', () => {
  it('sets and reads the default workspace', () => {
    createWorkspace(TEST_ROOT, 'first');
    createWorkspace(TEST_ROOT, 'second');
    setDefaultWorkspace(TEST_ROOT, 'second');
    expect(getDefaultWorkspace(TEST_ROOT)).toBe('second');
  });
});

describe('saveRegistry / loadRegistry', () => {
  it('persists and retrieves registry', () => {
    const reg = {
      workspaces: [{ name: 'test', createdAt: '2026-01-01T00:00:00.000Z' }],
      defaultWorkspace: 'test',
    };
    saveRegistry(TEST_ROOT, reg);
    const loaded = loadRegistry(TEST_ROOT);
    expect(loaded.workspaces[0].name).toBe('test');
    expect(loaded.defaultWorkspace).toBe('test');
  });

  it('throws when registry does not exist', () => {
    expect(() => loadRegistry(TEST_ROOT)).toThrow();
  });
});

describe('ensureWorkspaceDir', () => {
  it('creates directory if absent', () => {
    const dir = path.join(TEST_ROOT, 'newdir');
    expect(fs.existsSync(dir)).toBe(false);
    ensureWorkspaceDir(dir);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('does not throw if directory already exists', () => {
    const dir = path.join(TEST_ROOT, 'existing');
    fs.mkdirSync(dir, { recursive: true });
    expect(() => ensureWorkspaceDir(dir)).not.toThrow();
  });
});

describe('migrateLegacyData', () => {
  it('moves todos.json to workspace dir', () => {
    const todosPath = path.join(TEST_ROOT, 'todos.json');
    fs.writeFileSync(todosPath, '{"todos":[]}', 'utf-8');

    migrateLegacyData(TEST_ROOT, 'migrated');

    expect(fs.existsSync(todosPath)).toBe(false);
    expect(fs.existsSync(path.join(getWorkspaceDir(TEST_ROOT, 'migrated'), 'todos.json'))).toBe(true);
  });

  it('moves notes/ directory to workspace dir', () => {
    const notesPath = path.join(TEST_ROOT, 'notes');
    fs.mkdirSync(notesPath, { recursive: true });
    fs.writeFileSync(path.join(notesPath, 'note.md'), '# Note', 'utf-8');

    migrateLegacyData(TEST_ROOT, 'migrated');

    expect(fs.existsSync(notesPath)).toBe(false);
    const wsNotesPath = path.join(getWorkspaceDir(TEST_ROOT, 'migrated'), 'notes', 'note.md');
    expect(fs.existsSync(wsNotesPath)).toBe(true);
  });

  it('moves .encrypted and .salt markers if present', () => {
    fs.writeFileSync(path.join(TEST_ROOT, '.encrypted'), '', 'utf-8');
    fs.writeFileSync(path.join(TEST_ROOT, '.salt'), 'abc123', 'utf-8');

    migrateLegacyData(TEST_ROOT, 'migrated');

    expect(fs.existsSync(path.join(TEST_ROOT, '.encrypted'))).toBe(false);
    const wsDir = getWorkspaceDir(TEST_ROOT, 'migrated');
    expect(fs.existsSync(path.join(wsDir, '.encrypted'))).toBe(true);
    expect(fs.existsSync(path.join(wsDir, '.salt'))).toBe(true);
  });

  it('skips items that do not exist', () => {
    expect(() => migrateLegacyData(TEST_ROOT, 'emptyws')).not.toThrow();
  });
});

describe('resolveActiveWorkspace', () => {
  it('returns cliArg workspace if it exists', async () => {
    createWorkspace(TEST_ROOT, 'myws');
    const result = await resolveActiveWorkspace(TEST_ROOT, 'myws');
    expect(result).toBe('myws');
  });

  it('exits if cliArg workspace does not exist', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await resolveActiveWorkspace(TEST_ROOT, 'missing');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('returns defaultWorkspace from registry when no cliArg', async () => {
    createWorkspace(TEST_ROOT, 'first');
    createWorkspace(TEST_ROOT, 'second');
    setDefaultWorkspace(TEST_ROOT, 'second');
    const result = await resolveActiveWorkspace(TEST_ROOT);
    expect(result).toBe('second');
  });
});
