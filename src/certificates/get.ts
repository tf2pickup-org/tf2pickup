import { yearsToDays } from 'date-fns'
import { collections } from '../database/collections'
import { logger } from '../logger'
import pem from 'pem'
import type { CertificateModel } from '../database/models/certificate.model'

interface Certificate {
  clientKey: string
  certificate: string
}

const createCertificate = (options: pem.CertificateCreationOptions) =>
  new Promise<Certificate>((resolve, reject) => {
    pem.createCertificate(options, (error, result) => {
      if (error) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(error)
      } else {
        resolve(result)
      }
    })
  })

export async function get(purpose: string): Promise<CertificateModel> {
  logger.trace(`certificates.get(purpose=${purpose})`)
  const c = await collections.certificates.findOne({ purpose })
  if (c !== null) {
    return c
  }

  const { clientKey, certificate } = await createCertificate({
    days: yearsToDays(10),
    selfSigned: true,
  })
  await collections.certificates.insertOne({ purpose, clientKey, certificate })
  logger.info({ purpose }, `certificate created`)
  return { purpose, clientKey, certificate }
}
