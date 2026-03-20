const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Disable hardware acceleration on Linux to prevent GPU/Wayland crashes (ENOMEM)
if (process.platform === 'linux') {
  app.disableHardwareAcceleration();
}

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

  const PORT = 3077;

  if (isDev) {
    win.loadURL(`http://localhost:${PORT}`);
    win.webContents.openDevTools();
  } else {
    // In production, start the Next.js server
    // Use the unpacked path since asar contents cannot be executed directly
    const appPath = app.getAppPath();
    const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
    
    // Point directly to the next CLI script
    const nextPath = path.join(unpackedPath, 'node_modules', 'next', 'dist', 'bin', 'next');
    
    // Spawn using the current process execPath (which is Electron)
    // and set ELECTRON_RUN_AS_NODE to run it as a regular Node.js script
    nextProcess = spawn(process.execPath, [nextPath, 'start', '-p', PORT.toString()], {
      cwd: unpackedPath,
      env: { 
        ...process.env, 
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1'
      }
    });

    // Give it a few seconds to start
    const pollServer = () => {
      fetch(`http://localhost:${PORT}`)
        .then(() => win.loadURL(`http://localhost:${PORT}`))
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
