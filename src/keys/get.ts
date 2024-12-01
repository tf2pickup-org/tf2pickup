import {
  createPrivateKey,
  createPublicKey,
  generateKeyPair as generateKeyPairCb,
} from 'node:crypto'
import { collections } from '../database/collections'
import { environment } from '../environment'
import { logger } from '../logger'
import { promisify } from 'node:util'
import type { KeyPair } from './types/key-pair'

const generateKeyPair = promisify(generateKeyPairCb)

export async function get(keyName: string): Promise<KeyPair> {
  logger.trace(`keys.get(keyName=${keyName})`)
  const key = await collections.keys.findOne({ name: keyName })
  if (key === null) {
    logger.info(`key pair "${keyName}" not found, generating new one...`)
    const keyPair = await generateKeyPair('ec', { namedCurve: 'secp521r1' })
    await collections.keys.insertOne({
      name: keyName,
      privateKeyEncoded: keyPair.privateKey
        .export({
          format: 'pem',
          type: 'pkcs8',
          passphrase: environment.KEY_STORE_PASSPHRASE,
          cipher: 'aes-256-cbc',
        })
        .toString(),
      publicKeyEncoded: keyPair.publicKey
        .export({
          format: 'pem',
          type: 'spki',
        })
        .toString(),
    })
    logger.info({ name: keyName }, `key pair "${keyName} generated`)
    return keyPair
  } else {
    const privateKey = createPrivateKey({
      key: key.privateKeyEncoded,
      format: 'pem',
      passphrase: environment.KEY_STORE_PASSPHRASE,
    })
    const publicKey = createPublicKey({ key: key.publicKeyEncoded, format: 'pem' })
    return { publicKey, privateKey }
  }
}
