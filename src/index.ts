#!/usr/bin/env node

import { getDataDir, setActiveDataDir, ensureDataDir } from './storage';
import { initEncryption, setupEncryption } from './encryption';
import { startREPL } from './repl';
import { resolveActiveWorkspace, getWorkspaceDir, ensureWorkspaceDir } from './workspace';

function parseCLIArg(): string | undefined {
  const args = process.argv.slice(2);
  const wsFlag = args.indexOf('--workspace');
  if (wsFlag !== -1 && args[wsFlag + 1]) {
    return args[wsFlag + 1];
  }
  const positional = args.find(a => !a.startsWith('-'));
  return positional;
}

(async () => {
  const root = getDataDir();
  const cliArg = parseCLIArg();
  const wsName = await resolveActiveWorkspace(root, cliArg);
  const wsDir = getWorkspaceDir(root, wsName);
  ensureWorkspaceDir(wsDir);
  setActiveDataDir(wsDir);
  ensureDataDir();
  initEncryption(wsName, wsDir);
  await setupEncryption(wsName, wsDir);
  startREPL(wsName);
})();
