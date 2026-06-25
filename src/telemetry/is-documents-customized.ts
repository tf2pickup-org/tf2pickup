import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { collections } from '../database/collections'

const seededDocuments = [
  { name: 'rules', file: 'rules.md' },
  { name: 'privacy policy', file: 'privacy-policy.md' },
]

/** True when any seeded document (rules / privacy policy) differs from its shipped default. */
export async function isDocumentsCustomized(): Promise<boolean> {
  const docs = await collections.documents
    .find({ name: { $in: seededDocuments.map(doc => doc.name) } })
    .toArray()

  for (const { name, file } of seededDocuments) {
    const stored = docs.find(doc => doc.name === name)?.body
    if (stored === undefined) {
      continue
    }
    const shipped = (
      await readFile(resolve(import.meta.dirname, '..', 'documents', 'default', file))
    ).toString()
    if (stored !== shipped) {
      return true
    }
  }

  return false
}
