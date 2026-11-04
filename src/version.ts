import { readFile } from 'node:fs/promises'
import { packageUp } from 'package-up'
import { z } from 'zod'

const packageJsonPath = await packageUp()
if (!packageJsonPath) {
  throw new Error(`cannot find package.json in ${import.meta.dirname}`)
}

const file = await readFile(packageJsonPath)
const packageJsonSchema = z.object({ version: z.string() })

const { version: packageVersion } = packageJsonSchema.parse(JSON.parse(file.toString()))
const commit = process.env['GIT_COMMIT']

export const version = commit ? `${packageVersion}+${commit.slice(0, 7)}` : packageVersion
