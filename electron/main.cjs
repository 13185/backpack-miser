const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');
const isDev = !app.isPackaged || process.env.BM_DEV === '1';
app.setName('背包守财奴');
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 500, resizable: true,
    title: '背包守财奴', autoHideMenuBar: true, backgroundColor: '#000000',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { partition: 'persist:backpack-miser', devTools: isDev, contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    const k = (input.key || '').toLowerCase();
    if (!isDev && (input.key === 'F12' || ((input.control || input.meta) && input.shift && ['i','j','c'].includes(k)))) e.preventDefault();
    if (!isDev && (input.control || input.meta) && (k === 'r' || input.key === 'F5')) {} // allow reload
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}
Menu.setApplicationMenu(null);
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
