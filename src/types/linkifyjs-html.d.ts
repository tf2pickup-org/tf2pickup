declare module 'linkifyjs/html' {
  interface LinkifyHtmlOptions {
    attributes?: Record<string, string>
    className?: string
    defaultProtocol?: string
    events?: Record<string, (event: unknown) => void>
    format?: (value: string, type: string) => string
    formatHref?: (href: string, type: string) => string
    ignoreTags?: string[]
    nl2br?: boolean
    tagName?: string
    target?: string | Record<string, string>
    validate?: boolean | Record<string, ((value: string) => boolean) | boolean>
    truncate?: number | [number, number]
  }

  export default function linkifyHtml(input: string, options?: LinkifyHtmlOptions): string
}
