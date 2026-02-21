#!/usr/bin/env node

import { getStorageLocation, ensureDataDir } from './storage';
import { initEncryption, setupEncryption } from './encryption';
import { startREPL } from './repl';

(async () => {
  ensureDataDir();
  initEncryption(getStorageLocation());
  await setupEncryption();
  startREPL();
})();
