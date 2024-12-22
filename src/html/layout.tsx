import { environment } from '../environment'
import { ReadyUpDialog } from '../queue/views/html/ready-up-dialog'
import Html from '@kitajs/html'
import { FlashMessages } from './components/flash-messages'
import { resolve } from 'path'
import { requestContext } from '@fastify/request-context'
import { embed } from './embed'

export async function Layout(
  props?: Html.PropsWithChildren<{
    title?: string
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

  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="icon" type="image/x-icon" href="/favicon.ico" />
          <script src="/js/main.js" type="module"></script>
          <style type="text/css">{safeCss}</style>
          {title}
        </head>
        <body hx-ext="ws,head-support" ws-connect="/ws" class="h-screen" hx-boost="true">
          {body}
        </body>
      </html>
    </>
  )
}
