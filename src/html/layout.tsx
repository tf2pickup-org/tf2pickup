import { environment } from '../environment'
import { ReadyUpDialog } from '../queue/views/html/ready-up-dialog'
import Html from '@kitajs/html'
import { FlashMessages } from './components/flash-messages'
import { bundle } from '.'
import { resolve } from 'path'

const mainJs = await bundle(resolve(import.meta.dirname, 'bundle', 'main.js'))
const mainCss = await bundle(resolve(import.meta.dirname, 'styles', 'main.css'))

export function Layout(
  props?: Html.PropsWithChildren<{
    title?: string
    head?: string | Promise<string>
  }>,
) {
  const safeHead = props?.head ?? ''
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src={mainJs}></script>
          <link href={mainCss} rel="stylesheet"></link>
          <title>{props?.title ?? environment.WEBSITE_NAME}</title>
          {safeHead}
        </head>
        <body hx-boost="true" hx-ext="ws,head-support" ws-connect="/ws" class="h-screen">
          <div class="flex h-full flex-col">{props?.children}</div>
          <div id="notify-container"></div>
          <ReadyUpDialog />
          <FlashMessages />
        </body>
      </html>
    </>
  )
}
