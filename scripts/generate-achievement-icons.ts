#!/usr/bin/env tsx
/**
 * One-off script that generates icon components for every achievement via the Recraft API.
 *
 * Usage:
 *   RECRAFT_API_TOKEN=<token> pnpm tsx scripts/generate-achievement-icons.ts
 *
 * Output: src/achievements/views/html/icons/<id>.tsx  (one file per achievement)
 *
 * Each file exports a single JSX function component named in PascalCase, e.g.
 *   first-blood.tsx  →  export function FirstBloodIcon(...)
 *
 * Style note: recraftv3_vector + "Bold stroke" was chosen for clean single-colour
 * scalable icons that read well at small sizes (28 px default). Re-run with a
 * different style value if you want a different look.
 */

import { NodeType, parse as parseHtml } from 'node-html-parser'
import type { HTMLElement as ParsedElement, Node as ParsedNode } from 'node-html-parser'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// ── Config ────────────────────────────────────────────────────────────────────

const TOKEN = process.env['RECRAFT_API_TOKEN']
if (!TOKEN) {
  console.error('Error: RECRAFT_API_TOKEN environment variable is required')
  process.exit(1)
}

const RECRAFT_URL = 'https://external.api.recraft.ai/v1/images/generations'
const MODEL = 'recraftv4_1_vector'
const STYLE = 'Bold stroke'
const DEFAULT_ICON_SIZE = 28
const DELAY_MS = 600 // stay well within 100 req/min

const OUTPUT_DIR = join(import.meta.dirname, '..', 'src', 'achievements', 'views', 'html', 'icons')

// ── Achievement definitions ───────────────────────────────────────────────────

interface IconDef {
  id: string // kebab-case, becomes filename and CSS class
  name: string // PascalCase component name (without "Icon" suffix)
  prompt: string
}

const icons: IconDef[] = [
  // Games played
  {
    id: 'first-blood',
    name: 'FirstBlood',
    prompt:
      'minimalist bold-stroke icon of a single blood drop, clean geometric shape, no text, no background, centered composition',
  },
  {
    id: 'mercenary',
    name: 'Mercenary',
    prompt:
      'minimalist bold-stroke icon of a stack of three coins, clean lines, no text, no background',
  },
  {
    id: 'grizzled-veteran',
    name: 'GrizzledVeteran',
    prompt:
      'minimalist bold-stroke icon of a military service medal with a ribbon, clean lines, no text, no background',
  },
  {
    id: 'f2p-no-more',
    name: 'F2pNoMore',
    prompt:
      'minimalist bold-stroke icon of a graduation mortarboard cap, clean lines, no text, no background',
  },
  {
    id: 'australium-legend',
    name: 'AustraliumLegend',
    prompt:
      'minimalist bold-stroke icon of a trophy cup with a star on top, clean lines, no text, no background',
  },
  // Class-specific
  {
    id: 'ze-healing',
    name: 'ZeHealing',
    prompt:
      'minimalist bold-stroke icon of a medical cross with a small heart inside, clean lines, no text, no background',
  },
  {
    id: 'ubermensch',
    name: 'Ubermensch',
    prompt:
      'minimalist bold-stroke icon of a medical syringe with a cross symbol, clean lines, no text, no background',
  },
  {
    id: 'grasshopper',
    name: 'Grasshopper',
    prompt:
      'minimalist bold-stroke icon of a running human figure with speed lines, clean lines, no text, no background',
  },
  {
    id: 'maggots',
    name: 'Maggots',
    prompt:
      'minimalist bold-stroke icon of a military combat helmet, clean lines, no text, no background',
  },
  {
    id: 'kabooom',
    name: 'Kabooom',
    prompt:
      'minimalist bold-stroke icon of a starburst explosion with jagged rays, clean lines, no text, no background',
  },
  // Substitute
  {
    id: 'reinforcements',
    name: 'Reinforcements',
    prompt: 'minimalist bold-stroke icon of an open parachute, clean lines, no text, no background',
  },
  {
    id: 'mann-co-reserve',
    name: 'MannCoReserve',
    prompt:
      'minimalist bold-stroke icon of a circular reserve badge with a star in the center, clean lines, no text, no background',
  },
  // Server join speed
  {
    id: 'need-a-dispenser-here',
    name: 'NeedADispenserHere',
    prompt:
      'minimalist bold-stroke icon of a boxy machine dispenser with a lightning bolt symbol, clean lines, no text, no background',
  },
  // No disconnects
  {
    id: 'iron-mann',
    name: 'IronMann',
    prompt:
      'minimalist bold-stroke icon of a riveted iron shield, clean lines, no text, no background',
  },
  {
    id: 'mann-of-steel',
    name: 'MannOfSteel',
    prompt:
      'minimalist bold-stroke icon of a steel breastplate armor, clean lines, no text, no background',
  },
  // Top DPM
  {
    id: 'top-damage-dealer',
    name: 'TopDamageDealer',
    prompt: 'minimalist bold-stroke icon of a bold flame, clean lines, no text, no background',
  },
  {
    id: 'pain-train',
    name: 'PainTrain',
    prompt:
      'minimalist bold-stroke icon of a locomotive train seen from the front, clean lines, no text, no background',
  },
  {
    id: 'australium-rl',
    name: 'AustraliumRl',
    prompt:
      'minimalist bold-stroke icon of a rocket launcher tube, clean lines, no text, no background',
  },
  // High HPM
  {
    id: 'quick-fix',
    name: 'QuickFix',
    prompt:
      'minimalist bold-stroke icon of a first-aid kit box with a cross symbol, clean lines, no text, no background',
  },
  {
    id: 'miracle-worker',
    name: 'MiracleWorker',
    prompt:
      'minimalist bold-stroke icon of a glowing halo ring floating above a medical cross, clean lines, no text, no background',
  },
  {
    id: 'mannpower-medic',
    name: 'MannpowerMedic',
    prompt:
      'minimalist bold-stroke icon of a flexing muscular arm with a small medical cross symbol, clean lines, no text, no background',
  },
]

// ── Recraft API ───────────────────────────────────────────────────────────────

async function generateSvg(prompt: string): Promise<string> {
  const res = await fetch(RECRAFT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model: MODEL, style: STYLE, n: 1, size: '1:1' }),
  })

  if (!res.ok) {
    throw new Error(`Recraft API ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as { data: { url: string }[] }
  const url = json.data[0]?.url
  if (!url) throw new Error('No URL in Recraft response')

  const svgRes = await fetch(url)
  if (!svgRes.ok) throw new Error(`Failed to download SVG: ${svgRes.status}`)
  return svgRes.text()
}

// ── SVG → JSX serialization ───────────────────────────────────────────────────

// Matches any explicit color value (hex, rgb(), named colours).
// Preserves "none" and "currentColor" — those are not stripped.
const COLOR_VALUE_RE =
  /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|black|white|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|transparent)/i

function isColorValue(v: string): boolean {
  return COLOR_VALUE_RE.test(v)
}

// Detects white/near-white fills that should map to transparent rather than currentColor.
// Recraft v4+ splits the canvas into foreground (dark fill) and background (white fill) segments;
// stripping both equally leaves everything as currentColor and paints the whole canvas.
const LIGHT_COLOR_RE = /^(white|#fff\b|#fff{3}\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i

function isLightColor(v: string): boolean {
  return LIGHT_COLOR_RE.test(v.trim())
}

function serializeNode(node: ParsedNode, indent: string): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    // Escape JSX expression delimiters in raw text (e.g. JSON content in <metadata>)
    return node.rawText.trim().replace(/\{/g, "{'{'}").replace(/\}/g, "{'}'}")
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return ''

  const el = node as ParsedElement
  const tag = el.rawTagName

  // Drop non-visual elements — <defs> (gradients), <metadata> (Recraft signature)
  if (tag === 'defs' || tag === 'metadata') return ''

  const attrs: Record<string, string> = {}

  // The API places a full-canvas background path as the first element (M 0 0 … 2048 … z).
  // After color stripping it would inherit currentColor and paint a solid square, so force it transparent.
  const isBackgroundPath =
    tag === 'path' &&
    (el.attrs['d'] ?? '').startsWith('M 0 0') &&
    (el.attrs['d'] ?? '').includes('2048')

  for (const [k, v] of Object.entries(el.attrs)) {
    if (k === 'fill') {
      if (isBackgroundPath) {
        attrs['fill'] = 'none'
        continue
      }
      // Map colored fills: light (white) → none (transparent background segments),
      // dark/other → drop so children inherit "currentColor" from the SVG parent.
      // Recraft v4+ tiles the canvas with foreground+background path segments; treating
      // both the same way paints the whole canvas. url() gradient refs are also dropped
      // (their defs are stripped above).
      if (v !== 'none' && v !== 'currentColor' && (isColorValue(v) || v.startsWith('url('))) {
        if (isLightColor(v)) attrs['fill'] = 'none'
        continue
      }
    }
    if (k === 'stroke') {
      // Replace colored strokes with "currentColor" so they stay visible.
      // Preserve stroke="none" and stroke="currentColor" as-is.
      if (v !== 'none' && v !== 'currentColor' && (isColorValue(v) || v.startsWith('url('))) {
        attrs['stroke'] = 'currentColor'
        continue
      }
    }
    // Drop stop-color / stop-opacity (only meaningful inside gradient defs)
    if (k === 'stop-color' || k === 'stop-opacity') continue
    attrs[k] = v
  }

  if (isBackgroundPath && !('fill' in attrs)) attrs['fill'] = 'none'

  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
    .join(' ')

  const childIndent = `${indent}  `
  const children = el.childNodes.map(child => serializeNode(child, childIndent)).filter(Boolean)

  const openTag = `<${tag}${attrStr ? ` ${attrStr}` : ''}>`
  const closeTag = `</${tag}>`

  if (children.length === 0) {
    return `${indent}<${tag}${attrStr ? ` ${attrStr}` : ''} />`
  }
  if (children.every(c => !c.includes('\n')) && children.join('').length < 80) {
    return `${indent}${openTag}${children.join('')}${closeTag}`
  }
  return `${indent}${openTag}\n${children.map(c => (c.startsWith(childIndent) ? c : `${childIndent}${c}`)).join('\n')}\n${indent}${closeTag}`
}

function svgToTsx(icon: IconDef, svgText: string): string {
  const root = parseHtml(svgText)
  const svgEl = root.querySelector('svg')
  if (!svgEl) throw new Error('No <svg> element in response')

  const viewBox = svgEl.getAttribute('viewBox') ?? '0 0 100 100'

  const innerLines = svgEl.childNodes
    .map(child => serializeNode(child, '      '))
    .filter(Boolean)
    .join('\n')

  return `export function ${icon.name}Icon(props: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${viewBox}"
      width={props.size ?? ${DEFAULT_ICON_SIZE}}
      height={props.size ?? ${DEFAULT_ICON_SIZE}}
      fill="currentColor"
    >
${innerLines}
    </svg>
  )
}
`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  // Optional: pass icon IDs as CLI args to regenerate only specific icons.
  // e.g.  pnpm tsx scripts/generate-achievement-icons.ts first-blood mercenary
  const filter = new Set(process.argv.slice(2))
  const queue = filter.size > 0 ? icons.filter(i => filter.has(i.id)) : icons

  await mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`Output directory: ${OUTPUT_DIR}`)
  console.log(`Model: ${MODEL}  Style: ${STYLE}`)
  console.log(`Generating ${queue.length} icons...\n`)

  let ok = 0
  let failed = 0

  for (const icon of queue) {
    process.stdout.write(`  ${icon.id} ... `)
    try {
      const svgText = await generateSvg(icon.prompt)
      const tsx = svgToTsx(icon, svgText)
      const outPath = join(OUTPUT_DIR, `${icon.id}.tsx`)
      await writeFile(outPath, tsx, 'utf8')
      console.log('✓')
      ok++
    } catch (err) {
      console.log(`✗  ${(err as Error).message}`)
      failed++
    }

    if (ok + failed < queue.length) await sleep(DELAY_MS)
  }

  console.log(`\nDone: ${ok} generated, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

void main()
