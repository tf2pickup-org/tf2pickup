import { format, formatDistanceToNow } from 'date-fns'
import { configuration } from '../../../configuration'
import { Footer } from '../../../html/components/footer'
import { IconCheck, IconX } from '../../../html/components/icons'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'
import { players } from '../../../players'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getVerificationCode } from '../../get-verification-code'

export async function MumbleVerificationPage(props: { steamId: SteamId64 }) {
  const player = await players.bySteamId(props.steamId, ['mumbleCertificate', 'bans'])
  const [host, port, password, botName] = await Promise.all([
    configuration.get('games.voice_server.mumble.url'),
    configuration.get('games.voice_server.mumble.port'),
    configuration.get('games.voice_server.mumble.password'),
    configuration.get('games.voice_server.mumble.username'),
  ])

  const serverUrl = new URL(`mumble://${host}`)
  serverUrl.port = `${port}`
  if (password) {
    serverUrl.password = password
  }

  return (
    <Layout title={makeTitle('Mumble verification')}>
      <NavigationBar />
      <Page>
        <div class="text-abru-light-75 container mx-auto flex max-w-3xl flex-col gap-8">
          <section class="bg-abru-dark-25 flex flex-col gap-4 rounded-lg p-[24px]">
            <h4 class="text-[24px] font-bold">Mumble verification</h4>
            <p>
              Game channels on our Mumble server are open only to that game's players. The bot
              recognizes you by your Mumble certificate, so link it to your account once and you're
              set.
            </p>
            {player.mumbleCertificate ? (
              <p class="flex flex-row items-center gap-2" id="mumble-verification-status">
                <IconCheck class="shrink-0 text-green-600" />
                <span>
                  Your Mumble certificate is linked to your account since{' '}
                  <span safe>{format(player.mumbleCertificate.boundAt, 'MMMM d, yyyy')}</span>.
                </span>
              </p>
            ) : (
              <p class="flex flex-row items-center gap-2" id="mumble-verification-status">
                <IconX class="shrink-0 text-red-600" />
                <span>Your Mumble certificate isn't linked to your account yet.</span>
              </p>
            )}
          </section>

          <section class="bg-abru-dark-25 flex flex-col gap-4 rounded-lg p-[24px]">
            <h4 class="text-[24px] font-bold">
              {player.mumbleCertificate ? 'Verify again' : 'Link your certificate'}
            </h4>
            {!!player.mumbleCertificate && (
              <p>Only needed if you use a new computer or a new certificate.</p>
            )}
            {players.hasActiveBan(player) ? (
              <p>You can't verify while you're banned.</p>
            ) : (
              <VerificationSteps
                steamId={props.steamId}
                serverUrl={serverUrl}
                host={host ?? ''}
                port={port}
                botName={botName}
              />
            )}
          </section>

          <section
            class="bg-abru-dark-25 flex flex-col gap-4 rounded-lg p-[24px]"
            id="new-certificate"
          >
            <h4 class="text-[24px] font-bold">Lost your certificate?</h4>
            <p>
              Mumble keeps your certificate on your computer. If you reinstalled Mumble, switched
              computers, or the bot says your certificate is linked to another account, create a new
              one:
            </p>
            <ol class="list-inside list-decimal">
              <li>
                In Mumble, open <strong>Configure → Certificate Wizard</strong>.
              </li>
              <li>
                Choose <strong>Create a new certificate</strong> and follow the steps.
              </li>
              <li>Reconnect to the server and send the bot a new code.</li>
            </ol>
            <p>Your new certificate replaces the old one on your account.</p>
          </section>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}

async function VerificationSteps(props: {
  steamId: SteamId64
  serverUrl: URL
  host: string
  port: number
  botName: string
}) {
  const { code, expiresAt } = await getVerificationCode(props.steamId)
  return (
    <ol class="flex flex-col gap-6">
      <li class="flex flex-col gap-2">
        <span class="text-abru-light-85 font-bold">1. Connect to the Mumble server</span>
        <div class="flex flex-row flex-wrap items-center gap-4">
          <a
            href={props.serverUrl.toString()}
            class="button"
            data-variant="accent"
            data-umami-event="mumble-verification-open-mumble"
          >
            Open Mumble
          </a>
          <span>
            or add it by hand: <code safe>{props.host}</code>, port{' '}
            <code safe>{props.port.toString()}</code>
          </span>
        </div>
      </li>
      <li class="flex flex-col gap-2">
        <span class="text-abru-light-85 font-bold">2. Send this code to the bot</span>
        <span>
          Find <strong safe>{props.botName}</strong> in the channel list, right-click it, choose{' '}
          <strong>Send Message</strong> and send:
        </span>
        <code
          class="bg-abru-light-5 text-abru-light-85 self-start rounded-sm px-4 py-2 text-2xl tracking-widest"
          id="mumble-verification-code"
          safe
        >
          {`${code.slice(0, 4)}-${code.slice(4)}`}
        </code>
        <span class="text-sm">
          It works once and expires{' '}
          <span safe>{formatDistanceToNow(expiresAt, { addSuffix: true })}</span>. Once it expires,
          reload this page for a new one.
        </span>
      </li>
      <li class="flex flex-col gap-2">
        <span class="text-abru-light-85 font-bold">3. Wait for the bot's reply</span>
        <span>It tells you as soon as your certificate is linked.</span>
      </li>
    </ol>
  )
}
