import { KeyObject } from 'node:crypto'

export interface KeyPair {
  privateKey: KeyObject
  publicKey: KeyObject
}
