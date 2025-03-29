/* eslint-disable @typescript-eslint/no-base-to-string */
import { environment } from '../environment'
import { ReadyUpDialog } from '../queue/views/html/ready-up-dialog'
import Html from '@kitajs/html'
import { FlashMessages } from './components/flash-messages'
import { resolve } from 'path'
import { requestContext } from '@fastify/request-context'
import { embed } from './embed'
import { bundle } from './bundle'
import { mainTsPath } from './main-ts-path'
import type { User } from '../auth/types/user'

export async function Layout(
  props?: Html.PropsWithChildren<{
    user?: User | undefined
    title?: string
    description?: string
    canonical?: string
    embedStyle?: string
  }>,
) {
  const title = <title safe>{props?.title ?? environment.WEBSITE_NAME}</title>
  const body = (
    <>
      {props?.embedStyle ? <style type="text/css">{embed(props.embedStyle)}</style> : <></>}
      <div class="flex h-full flex-col">{props?.children}</div>
      <div id="notify-container"></div>
      <ReadyUpDialog />
      <FlashMessages />
    </>
  )

  const boosted = requestContext.get('boosted')

  // if we're coming from boosted request, render only the fragment
  if (boosted) {
    return (
      <>
        {body}
        {title}
      </>
    )
  }

  const safeCss = await embed(resolve(import.meta.dirname, 'styles', 'main.css'))
  const bundleUrl = await bundle(mainTsPath)
  const umamiEnabled = !!(environment.UMAMI_SCRIPT_SRC && environment.UMAMI_WEBSITE_ID)

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <script src={bundleUrl} type="module"></script>
        <style type="text/css">{safeCss}</style>
        {umamiEnabled && (
          <script
            defer
            src={environment.UMAMI_SCRIPT_SRC}
            data-website-id={environment.UMAMI_WEBSITE_ID}
          ></script>
        )}

        {title}
        <MetaTags {...props} />
      </head>
      <body
        hx-ext="ws,head-support,remove-me,preload,notifications,play-sound,copy-to-clipboard"
        ws-connect="/ws"
        class="h-screen"
        hx-boost="true"
      >
        {umamiEnabled && !!props?.user && (
          <script>{`document.addEventListener('DOMContentLoaded', () => {umami.identify({ steamId: '${props.user.player.steamId}' });});`}</script>
        )}
        {body}
      </body>
    </html>
  )
}

function MetaTags(props?: { title?: string; description?: string; canonical?: string }) {
  const safeMetaTags: JSX.Element[] = []
  const safeOgTags: JSX.Element[] = []

  if (props?.title) {
    safeOgTags.push(<meta property="og:title" content={props.title} />)
  }

  if (props?.description) {
    safeMetaTags.push(<meta name="description" content={props.description} />)
    safeOgTags.push(<meta property="og:description" content={props.description} />)
  }

  if (props?.canonical) {
    safeMetaTags.push(
      <link rel="canonical" href={`${environment.WEBSITE_URL}${props.canonical}`} />,
    )
    safeOgTags.push(
      <meta property="og:url" content={`${environment.WEBSITE_URL}${props.canonical}`} />,
    )
  }

  return (
    <>
      {safeMetaTags.join('\n')}
      {safeOgTags.join('\n')}
    </>
  )
}
