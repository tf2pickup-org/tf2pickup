import { readFileSync } from 'node:fs'
import { packageUpSync } from 'package-up'
import { z } from 'zod'

// no top-level await: otel.ts imports this, and awaiting here lets mongodb load before the SDK can patch it
const packageJsonPath = packageUpSync()
if (!packageJsonPath) {
  throw new Error(`cannot find package.json in ${import.meta.dirname}`)
}

const file = readFileSync(packageJsonPath)
const packageJsonSchema = z.object({ version: z.string() })

const { version: packageVersion } = packageJsonSchema.parse(JSON.parse(file.toString()))
const commit = process.env['GIT_COMMIT']

export const version = commit ? `${packageVersion}+${commit.slice(0, 7)}` : packageVersion
