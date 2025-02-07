interface NotificationPermissionsParams {
  button: HTMLButtonElement
  bannerDefault: HTMLElement
  bannerDenied: HTMLElement
}

export function requestNotificationPermissions(params: NotificationPermissionsParams) {
  if (Notification.permission === 'default') {
    params.bannerDefault.style.display = 'block'

    params.button.addEventListener('click', () => {
      Notification.requestPermission().then(permission => {
        params.bannerDefault.style.display = 'none'
        if (permission === 'denied') {
          params.bannerDenied.style.display = 'block'
        }
      })
    })
  } else if (Notification.permission === 'denied') {
    params.bannerDenied.style.display = 'block'
  }
}
