import linkifyHtml from 'linkifyjs/html'

const LINKIFY_OPTIONS = {
  attributes: {
    rel: 'noreferrer noopener',
  },
  target: '_blank',
} as const

export function formatChatMessageBody(originalBody: string): string {
  return linkifyHtml(originalBody, LINKIFY_OPTIONS)
}
