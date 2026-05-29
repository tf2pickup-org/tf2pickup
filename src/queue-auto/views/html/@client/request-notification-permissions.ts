interface NotificationPermissionsParams {
  button: HTMLButtonElement
  dismissButton: HTMLButtonElement
  bannerDefault: HTMLElement
  bannerDenied: HTMLElement
}

const dismissedBannerKey = 'notifications-banner-dismissed'

export function requestNotificationPermissions(params: NotificationPermissionsParams) {
  const isDismissed = localStorage.getItem(dismissedBannerKey) === 'true'

  if (Notification.permission === 'default') {
    params.bannerDefault.style.display = 'block'

    params.button.addEventListener('click', async () => {
      const permission = await Notification.requestPermission()
      params.bannerDefault.style.display = 'none'
      if (permission === 'denied' && !isDismissed) {
        params.bannerDenied.style.display = 'block'
      }
    })
  } else if (Notification.permission === 'denied' && !isDismissed) {
    params.bannerDenied.style.display = 'block'
  }

  params.dismissButton.addEventListener('click', () => {
    params.bannerDenied.style.display = 'none'
    localStorage.setItem(dismissedBannerKey, 'true')
  })
}
