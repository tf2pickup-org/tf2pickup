import { verificationCodeFormat } from './verification-code-format'

const validCode = new RegExp(
  `^[${verificationCodeFormat.alphabet}]{${verificationCodeFormat.length}}$`,
)

export function parseVerificationCode(message: string): string | undefined {
  const code = message
    .split(/<[^>]*>/)
    .join('')
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/[\s-]/g, '')
  return validCode.test(code) ? code : undefined
}
