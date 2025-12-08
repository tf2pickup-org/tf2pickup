import { requestContext } from '@fastify/request-context'
import { PlayerRole } from '../../database/models/player.model'
import { version as safeVersion } from '../../version'

const currentYear = new Date().getFullYear()

export function Footer() {
  const user = requestContext.get('user')
  return (
    <footer class="w-full">
      <div class="container mx-auto my-4">
        <div class="flex flex-col items-center gap-2 text-sm font-normal text-abru-light-75 md:flex-row md:gap-0">
          <span>
            © 2019-{currentYear} tf2pickup.org | version {safeVersion}
          </span>
          <div class="grow" />
          <div class="flex flex-col items-center gap-2 md:flex-row md:gap-5">
            <a href="/privacy-policy">Privacy policy</a>
            <a
              href="https://github.com/tf2pickup-org/tf2pickup"
              target="_blank"
              data-umami-event="social-github"
            >
              Github
            </a>
            <a
              href="https://github.com/tf2pickup-org/tf2pickup/blob/master/CHANGELOG.md"
              target="_blank"
              data-umami-event="changelog-link"
            >
              Changelog
            </a>

            {user?.player.roles.includes(PlayerRole.admin) && <a href="/admin">Admin panel</a>}
          </div>
        </div>
      </div>
    </footer>
  )
}
