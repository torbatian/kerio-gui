const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron')
const fs = require('fs')
const sudo = require('sudo-js')
const path = require('path')

if (fs.existsSync('pass.txt')) {
  const pass = fs.readFileSync('pass.txt')
  sudo.setPassword(pass)
}

const statuses = {
  unknown: 'unknown',
  running: 'running',
  stopped: 'stopped',
  error: 'error',
  pending: 'pending'
}
let tray
let mainWindow
let status = 'unknown'
let forceQuite = false
const activeRegex = /Active:\s*active\s*\(running\)/m

// function onClosed () {
//   mainWindow.hide()
//   return false
// }

function createMainWindow () {
  mainWindow = new BrowserWindow({
    width: 340,
    height: 130,
    show: false,
    // frame: false,
    maximizable: false,
    icon: path.join(__dirname, `icon-running.png`),
    skipTaskbar: true,
    fullscreenable: false,
    resizable: false,
    // transparent: true,
    webPreferences: {
      backgroundThrottling: false
    }
  })

  mainWindow.loadURL(`file://${__dirname}/index.html`)
  mainWindow.on('close', function (e) {
    if (!forceQuite) {
      e.preventDefault()
      mainWindow.hide()
    } else {
      mainWindow = null
    }
  })
  mainWindow.onbeforeunload = function () {
    return false
  }
}

function createTray () {
  tray = new Tray(path.join(__dirname, `icon-${status}.png`))
  tray.setTitle('Kerio Control Client')
  tray.setToolTip(status)
  const context = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: function () {
        showWindow()
      }
    },
    {
      label: 'Start',
      click: function () {
        run('start')
      }
    },
    {
      label: 'Stop',
      click: function () {
        run('stop')
      }
    },
    {
      label: 'Restart',
      click: function () {
        run('restart')
      }
    },
    {
      label: 'Exit',
      click: function () {
        app.quit()
      }
    }
  ])
  tray.on('click', function () {
    toggleWindow()
  })
  tray.setContextMenu(context)
}

function toggleWindow () {
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    showWindow()
  }
}

function showWindow () {
  mainWindow.show()
  mainWindow.focus()
}

function run (cmd) {
  const command = ['service', 'kerio-kvc', cmd]
  const options = { check: true, withResult: true }
  sudo.exec(command, options, function (error, pid, result) {
    getStatus()
  })
}

function getStatus () {
  changeStatus(statuses.pending)
  const command = ['service', 'kerio-kvc', 'status']
  const options = { check: true, withResult: true }
  sudo.exec(command, options, function (error, pid, result) {
    if (error) {
      changeStatus(statuses.error)
    } else if (activeRegex.test(result)) {
      changeStatus(statuses.running)
    } else {
      changeStatus(statuses.stopped)
    }
  })
}

function changeStatus (newStatus) {
  status = newStatus
  tray.setImage(path.join(__dirname, `icon-${status}.png`))
  tray.setToolTip(status)
}

app.on('before-quit', () => {
  forceQuite = true
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  } else {
    mainWindow.show()
  }
})

app.on('ready', () => {
  createMainWindow()
  createTray()
  getStatus()
})

ipcMain.on('status-updated', (event, status) => {
  changeStatus(status)
})
