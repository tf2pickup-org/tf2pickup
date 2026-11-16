export function shouldMirrorBan(reason: string, reasons: string[]) {
  const r = reason.toLowerCase()
  return reasons.length === 0 || reasons.some(entry => r.includes(entry.toLowerCase()))
}
