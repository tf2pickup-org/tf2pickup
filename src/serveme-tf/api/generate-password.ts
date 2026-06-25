import { generate } from 'generate-password'

export const generatePassword = () => generate({ length: 10, numbers: true, uppercase: true })
