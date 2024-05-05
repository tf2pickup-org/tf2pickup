export function Layout(
  props?: Html.PropsWithChildren<{ title?: string; head?: string | Promise<string> }>,
) {
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link
            rel="stylesheet"
            href="https://cdn.jsdelivr.net/npm/@tabler/icons@latest/iconfont/tabler-icons.min.css"
          ></link>
          <script src="https://unpkg.com/htmx.org@1.9.12"></script>
          <script src="https://unpkg.com/htmx.org@1.9.12/dist/ext/ws.js"></script>
          <link href="/main.css" rel="stylesheet"></link>
          <title>{props?.title ?? 'Hello World!'}</title>
          {props?.head}
        </head>
        <body>{props?.children}</body>
      </html>
    </>
  )
}
