import linkifyHtml from 'linkify-html'

const linkifyOptions = {
  attributes: {
    rel: 'noreferrer noopener',
  },
  target: '_blank',
} as const

export function formatChatMessageBody(originalBody: string): string {
  return linkifyHtml(originalBody, linkifyOptions)
}
