// Hollowspire desktop wrapper: serves the built web app over a custom app:// scheme in a phone-shaped window.
const { app, BrowserWindow, protocol, net, shell, Menu } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }])

const DIST = path.join(__dirname, '..', 'dist')

function createWindow() {
  const win = new BrowserWindow({
    width: 430, height: 900, minWidth: 360, minHeight: 640,
    title: 'Hollowspire', backgroundColor: '#0b0d14', autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  })
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' } })
  win.loadURL('app://hollowspire/index.html')
  if (process.env.HOLLOWSPIRE_SMOKE) {
    win.webContents.on('did-finish-load', async () => {
      await new Promise((r) => setTimeout(r, 2500))
      const ok = await win.webContents.executeJavaScript('!!document.querySelector("[data-testid=tap-target]") && !!document.querySelector("[data-testid=compass]")')
      const img = await win.webContents.capturePage()
      require('node:fs').writeFileSync(process.env.HOLLOWSPIRE_SMOKE, img.toPNG())
      console.log('SMOKE', ok ? 'OK' : 'FAIL')
      app.exit(ok ? 0 : 1)
    })
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  protocol.handle('app', (request) => {
    const u = new URL(request.url)
    let p = decodeURIComponent(u.pathname)
    if (p === '/' || p === '') p = '/index.html'
    const file = path.normalize(path.join(DIST, p))
    if (!file.startsWith(DIST)) return new Response('forbidden', { status: 403 })
    return net.fetch(pathToFileURL(file).toString())
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
