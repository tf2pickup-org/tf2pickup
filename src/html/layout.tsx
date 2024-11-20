import { environment } from '../environment'
import { ReadyUpDialog } from '../queue/views/html/ready-up-dialog'
import Html from '@kitajs/html'
import { FlashMessages } from './components/flash-messages'
import { bundle } from './bundle'
import { resolve } from 'path'
import { requestContext } from '@fastify/request-context'

const mainJs = await bundle(resolve(import.meta.dirname, 'bundle', 'main.js'))
const mainCss = await bundle(resolve(import.meta.dirname, 'styles', 'main.css'))

export function Layout(
  props?: Html.PropsWithChildren<{
    title?: string
    embedStyles?: string | string[]
    jsBundles?: string[]
  }>,
) {
  const title = <title>{props?.title ?? environment.WEBSITE_NAME}</title>
  const body = (
    <>
      {props?.embedStyles && (
        <style type="text/css" safe>
          {Array.isArray(props.embedStyles) ? props.embedStyles.join('\n') : props.embedStyles}
        </style>
      )}
      <div class="flex h-full flex-col">{props?.children}</div>
      <div id="notify-container"></div>
      <ReadyUpDialog />
      <FlashMessages />
    </>
  )
  const script = props?.jsBundles ? (
    <>
      {props.jsBundles.map(src => (
        <script src={src}></script>
      ))}
    </>
  ) : (
    <></>
  )

  const boosted = requestContext.get('boosted')

  // if we're coming from boosted request, render only the fragment
  if (boosted) {
    return (
      <>
        {body}
        {script}
        {title}
      </>
    )
  }

  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src={mainJs} hx-preserve></script>
          <link href={mainCss} rel="stylesheet" hx-preserve></link>
          {title}
          {script}
        </head>
        <body hx-ext="ws,head-support" ws-connect="/ws" class="h-screen" hx-boost="true">
          {body}
        </body>
      </html>
    </>
  )
}
