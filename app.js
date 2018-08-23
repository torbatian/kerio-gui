const sudo = require('sudo-js')
const fs = require('fs')
const { ipcRenderer } = require('electron')

if (fs.existsSync('pass.txt')) {
  const pass = fs.readFileSync('pass.txt')
  sudo.setPassword(pass)
}

let status = 'unknown'
const allStatuses = document.querySelectorAll('.status')
const unknownStatus = document.querySelector('.status.unknown')
const runningStatus = document.querySelector('.status.running')
const stoppedStatus = document.querySelector('.status.stopped')
const pendingStatus = document.querySelector('.status.pending')
const errorStatus = document.querySelector('.status.error')
changeStatus(status)

function getStatus () {
  changeStatus('pending')
  const activeRegex = /Active:\s*active\s*\(running\)/m

  const command = ['service', 'kerio-kvc', 'status']
  const options = { check: true, withResult: true }
  sudo.exec(command, options, function (error, pid, result) {
    if (error) {
      changeStatus('error')
    } else if (activeRegex.test(result)) {
      changeStatus('running')
    } else {
      changeStatus('stopped')
    }
    ipcRenderer.send('status-updated', status)
  })
}

function changeStatus (newStatus) {
  status = newStatus
  allStatuses.forEach(element => {
    element.classList.remove('show')
  })
  switch (newStatus) {
    case 'running':
      runningStatus.classList.add('show')
      break
    case 'pending':
      pendingStatus.classList.add('show')
      break
    case 'stopped':
      stoppedStatus.classList.add('show')
      break
    case 'error':
      errorStatus.classList.add('show')
      break
    default:
      unknownStatus.classList.add('show')
      break
  }
}

function start () {
  run('start')
}

function stop () {
  run('stop')
}

function restart () {
  run('restart')
}

function change () {
  const passwordInput = document.querySelector('#rootPassword')
	fs.writeFileSync('pass.txt', passwordInput.value, 'utf8')
	sudo.setPassword(passwordInput.value)
	getStatus()
}

function run (cmd) {
  changeStatus('pending')
  const command = ['service', 'kerio-kvc', cmd]
  const options = { check: true, withResult: true }
  sudo.exec(command, options, function (error, pid, result) {
    getStatus()
  })
}
