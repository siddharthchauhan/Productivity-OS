// Electron main entry. Boots the BrowserWindow, opens the DB, registers IPC,
// starts the tracker + schedulers.

import { app, BrowserWindow, Menu, Tray, nativeImage, shell } from 'electron';
import { join } from 'node:path';
import { db } from './db';
import { registerIpc } from './ipc';
import { startSchedulers, stopSchedulers } from './scheduler';
import { startTracker, stopTracker } from './tracker';
import { TRAY_ICON_1X, TRAY_ICON_2X } from './trayIcon';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1040,
    minHeight: 720,
    show: false,
    title: 'Pulse',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 12, y: 16 },
    backgroundColor: '#FFFFFF',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // electron-vite sets ELECTRON_RENDERER_URL during dev; in prod we load the
  // bundled index.html from the out/ folder.
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
}

function createTray() {
  // Black + alpha template image — macOS tints it for the menu bar (light/dark).
  const icon = nativeImage.createFromDataURL(TRAY_ICON_1X);
  icon.addRepresentation({ scaleFactor: 2, dataURL: TRAY_ICON_2X });
  icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.setToolTip('Pulse');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Pulse', click: () => showMainWindow() },
    { type: 'separator' },
    { label: 'Quit Pulse', click: () => app.quit() }
  ]));
  tray.on('click', () => showMainWindow());
}

app.whenReady().then(async () => {
  db(); // initialise schema
  registerIpc();

  // Tracking + schedulers can be toggled off in settings, but default to on.
  try {
    await startTracker({ captureTitles: true });
  } catch (err) {
    console.warn('[main] tracker failed to start:', err);
  }
  startSchedulers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep running in the dock on macOS so the tracker stays alive.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopTracker();
  stopSchedulers();
});
