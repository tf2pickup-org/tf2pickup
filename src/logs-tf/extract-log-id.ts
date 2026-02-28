export function extractLogId(logsUrl: string): number | null {
  const match = /\/(\d+)$/.exec(logsUrl)
  return match ? parseInt(match[1]!, 10) : null
}
