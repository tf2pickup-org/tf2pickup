// Crockford's base32: no I, L, O or U, so codes are easy to read and type
export const verificationCodeFormat = {
  alphabet: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  length: 8,
} as const
