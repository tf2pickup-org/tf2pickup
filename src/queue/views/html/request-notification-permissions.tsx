export function RequestNotificationPermissions() {
  return (
    <>
      <div id="notifications-permission-default" style="display: none;">
        <div class="banner banner--alert flex flex-col gap-y-2 md:flex-row">
          <p class="flex-1 text-center md:text-start">
            To be notified when a game is about to start, we need your permission to show browser
            notifications.
          </p>
          <button class="button button--dense button--alert" id="request-notifications-permission">
            Allow notifications
          </button>
        </div>
      </div>
      <div id="notifications-permission-denied" style="display: none;">
        <div class="banner banner--warning">
          <p class="flex-1">
            You have disabled browser notifications. You will not be warned when a game is about to
            start.
          </p>
        </div>
      </div>
      <script type="module">{`
        import { requestNotificationPermissions } from '/js/request-notification-permissions.js';

        const button = document.getElementById('request-notifications-permission');
        const bannerDefault = document.getElementById('notifications-permission-default');
        const bannerDenied = document.getElementById('notifications-permission-denied');

        requestNotificationPermissions({ button, bannerDefault, bannerDenied });
      `}</script>
    </>
  )
}
