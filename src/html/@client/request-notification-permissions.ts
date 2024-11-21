export function requestNotificationPermissions() {
  if (Notification.permission === 'default') {
    const banner = document.getElementById('notifications-permission-default')
    if (banner) {
      banner.style.display = 'block'
    }

    const button = document.getElementById('request-notifications-permission')
    if (!button) {
      return
    }

    button.addEventListener('click', () => {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const banner = document.getElementById('notifications-permission-default')
          if (banner) {
            banner.style.display = 'none'
          }
        } else if (permission === 'denied') {
          const banner = document.getElementById('notifications-permission-denied')
          if (banner) {
            banner.style.display = 'block'
          }
        }
      })
    })
  } else if (Notification.permission === 'denied') {
    const banner = document.getElementById('notifications-permission-denied')
    if (banner) {
      banner.style.display = 'block'
    }
  }
}

window.requestNotificationPermissions = requestNotificationPermissions
