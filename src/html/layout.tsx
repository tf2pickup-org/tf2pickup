import { environment } from '../environment'
import { ReadyUpDialog } from '../queue/views/html/ready-up-dialog'

export function Layout(
  props?: Html.PropsWithChildren<{ title?: string; head?: string | Promise<string> }>,
) {
  const safeHead = props?.head ?? ''
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://unpkg.com/htmx.org@1.9.12"></script>
          <script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/ws.js"></script>
          <script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/head-support.js"></script>
          <script src="https://unpkg.com/hyperscript.org@0.9.12"></script>
          <script src="/map-thumbnail.js"></script>
          <link href="/main.css" rel="stylesheet"></link>
          <title>{props?.title ?? environment.WEBSITE_NAME}</title>
          {safeHead}
        </head>
        <body hx-boost="true" hx-ext="ws,head-support" ws-connect="/ws" class="h-screen">
          <div class="flex h-full flex-col">{props?.children}</div>
          <div id="notify-container"></div>
          <ReadyUpDialog />
        </body>
      </html>
    </>
  )
}
