const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let nextProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    title: "VerilogSim IDE",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Set icon if available
    icon: path.join(__dirname, 'public', 'logo.svg')
  });

  // Check if we are in development or production
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    win.loadURL('http://localhost:3000');
    win.webContents.openDevTools();
  } else {
    // In production, start the Next.js server
    // We use 'bun' if available, otherwise 'node'
    const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next');
    
    nextProcess = spawn(nextPath, ['start', '-p', '3000'], {
      cwd: __dirname,
      env: { ...process.env, NODE_ENV: 'production' }
    });

    // Give it a few seconds to start
    const pollServer = () => {
      fetch('http://localhost:3000')
        .then(() => win.loadURL('http://localhost:3000'))
        .catch(() => setTimeout(pollServer, 1000));
    };
    
    pollServer();
  }

  win.on('closed', () => {
    if (nextProcess) nextProcess.kill();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (nextProcess) nextProcess.kill();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
