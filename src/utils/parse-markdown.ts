import { marked, type Tokens } from 'marked'
import { environment } from '../environment'

const renderer = {
  link({ href, title, text }: Tokens.Link): string {
    const localLink = href.startsWith(`${environment.WEBSITE_URL}/`)

    // to avoid title="null"
    if (title === null) {
      return localLink
        ? `<a href="${href}">${text}</a>`
        : `<a target="_blank" rel="noreferrer noopener" href="${href}">${text}</a>`
    }
    return localLink
      ? `<a href="${href}" title="${title}">${text}</a>`
      : `<a target="_blank" rel="noreferrer noopener" href="${href}" title="${title}">${text}</a>`
  },
}

marked.use({ renderer })

export async function parseMarkdown(markdown: string): Promise<string> {
  return await marked.parse(markdown)
}
