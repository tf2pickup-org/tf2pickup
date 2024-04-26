export function Layout(props?: Html.PropsWithChildren<{ head: string; title?: string }>) {
  return (
    <>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{props?.title ?? 'Hello World!'}</title>
        </head>
        <body>{props?.children}</body>
      </html>
    </>
  );
}