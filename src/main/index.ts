import { ipcMain, BrowserWindow } from 'electron';
import { resolve } from 'path';
import { platform, homedir } from 'os';
import { mkdirSync, existsSync, writeFileSync } from 'fs';

import { Global } from '@/interfaces/main';
import { createWindow, loadExtensions, registerProtocols } from '@/utils/main';
import { defaultPaths, filesContent } from '@/constants/paths';
import { getPath } from '@/utils/paths';
import {
  runAutoUpdaterService,
  runExtensionsService,
  runWebRequestService,
} from '@/services/main';
import * as extract from 'extract-zip';

ipcMain.setMaxListeners(0);

const { app, Menu } = require('electron');

app.setPath('userData', resolve(homedir(), '.wexond'));

declare const global: Global;

let mainWindow: BrowserWindow;

global.extensions = {};
global.backgroundPages = {};
global.databases = {};
global.extensionsLocales = {};
global.extensionsAlarms = {};
global.locale = 'en-US';

global.userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36';

app.on('activate', () => {
  if (process.platform === 'darwin') {
    // Create our menu entries so that we can use MAC shortcuts
  }
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    mainWindow = createWindow();
  }
});

app.on('ready', () => {
  // Create our menu entries so that we can use MAC shortcuts
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'pasteandmatchstyle' },
          { role: 'delete' },
          { role: 'selectall' },
          { role: 'quit' },
        ],
      },
    ]),
  );

  for (const key in defaultPaths) {
    const path = defaultPaths[key];
    const filePath = getPath(path);
    if (existsSync(filePath)) continue;

    if (path.indexOf('.') === -1) {
      mkdirSync(filePath);
    } else {
      writeFileSync(filePath, filesContent[key], 'utf8');
    }
  }

  if (!existsSync(resolve(getPath('extensions'), 'uBlock0.chromium'))) {
    extract(
      resolve('static/extensions/ublock.zip'),
      { dir: getPath('extensions') },
      err => {
        if (err) console.error(err);

        loadExtensions(mainWindow);
      },
    );
  }

  mainWindow = createWindow();

  loadExtensions(mainWindow);

  runAutoUpdaterService(mainWindow);
  runExtensionsService(mainWindow);
  runWebRequestService(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
});

app.on('window-all-closed', () => {
  if (platform() !== 'darwin') {
    app.quit();
  }
});

registerProtocols();
