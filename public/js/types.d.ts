declare module 'https://unpkg.com/htmx.org@2.0.2/dist/htmx.esm.js' {
  export * from 'htmx.org'
}

declare module 'https://esm.sh/chart.js@4.4.6?bundle-deps&exports=Chart,PieController,ArcElement,registerables' {
  export * from 'chart.js'
}

declare module 'https://cdn.jsdelivr.net/npm/howler@2.2.4/+esm' {
  export { Howl } from 'howler'
}

interface Window {
  htmx: typeof import('htmx.org').default
}
