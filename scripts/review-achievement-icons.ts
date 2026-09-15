#!/usr/bin/env tsx
/**
 * Interactive achievement icon review CLI.
 *
 * Opens a browser preview for each icon and lets you approve or regenerate
 * it until you're happy.
 *
 * Usage:
 *   RECRAFT_API_TOKEN=<token> pnpm tsx scripts/review-achievement-icons.ts [icon-id ...]
 *
 * If no icon IDs are given, goes through all icons in definition order.
 * Keys: [y/Enter] approve and next  [r] regenerate  [s] skip  [q] quit
 */

import { NodeType, parse as parseHtml } from 'node-html-parser'
import type { HTMLElement as ParsedElement, Node as ParsedNode } from 'node-html-parser'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'

const execAsync = promisify(exec)

// ── Config ────────────────────────────────────────────────────────────────────

const TOKEN = process.env['RECRAFT_API_TOKEN']
const RECRAFT_URL = 'https://external.api.recraft.ai/v1/images/generations'
const MODEL = 'recraftv3_vector'
const STYLE = 'Bold stroke'
const DEFAULT_ICON_SIZE = 28

const OUTPUT_DIR = join(import.meta.dirname, '..', 'src', 'achievements', 'views', 'html', 'icons')
const PREVIEW_PATH = join(tmpdir(), 'achievement-icon-preview.html')

// ── Achievement definitions ───────────────────────────────────────────────────

interface IconDef {
  id: string
  name: string
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

  if (!res.ok) throw new Error(`Recraft API ${res.status}: ${await res.text()}`)

  const json = (await res.json()) as { data: { url: string }[] }
  const url = json.data[0]?.url
  if (!url) throw new Error('No URL in Recraft response')

  const svgRes = await fetch(url)
  if (!svgRes.ok) throw new Error(`Failed to download SVG: ${svgRes.status}`)
  return svgRes.text()
}

// ── SVG → JSX serialization (identical to generate-achievement-icons.ts) ─────

const COLOR_VALUE_RE =
  /^(#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|hsl\(|hsla\(|black|white|red|green|blue|gray|grey|yellow|orange|purple|pink|brown|transparent)/i

function isColorValue(v: string): boolean {
  return COLOR_VALUE_RE.test(v)
}

const LIGHT_COLOR_RE = /^(white|#fff\b|#fff{3}\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))/i

function isLightColor(v: string): boolean {
  return LIGHT_COLOR_RE.test(v.trim())
}

function serializeNode(node: ParsedNode, indent: string): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return node.rawText.trim().replace(/\{/g, "{'{'}").replace(/\}/g, "{'}'}")
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return ''

  const el = node as ParsedElement
  const tag = el.rawTagName

  if (tag === 'defs' || tag === 'metadata') return ''

  const attrs: Record<string, string> = {}

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
      if (v !== 'none' && v !== 'currentColor' && (isColorValue(v) || v.startsWith('url('))) {
        if (isLightColor(v)) attrs['fill'] = 'none'
        continue
      }
    }
    if (k === 'stroke') {
      if (v !== 'none' && v !== 'currentColor' && (isColorValue(v) || v.startsWith('url('))) {
        attrs['stroke'] = 'currentColor'
        continue
      }
    }
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

// ── Preview helpers ───────────────────────────────────────────────────────────

function tsxToSvgHtml(tsxContent: string): string {
  const svgMatch = tsxContent.match(/<svg[\s\S]*?<\/svg>/)
  if (!svgMatch) throw new Error('Could not extract SVG from TSX')
  // Replace JSX dynamic expressions with concrete values for browser rendering
  return svgMatch[0]
    .replace(/width=\{[^}]+\}/g, 'width="256"')
    .replace(/height=\{[^}]+\}/g, 'height="256"')
}

function resizeSvg(svgHtml: string, size: number): string {
  return svgHtml
    .replace(/width="\d+"/, `width="${size}"`)
    .replace(/height="\d+"/, `height="${size}"`)
}

async function writePreview(icon: IconDef, tsxContent: string): Promise<void> {
  const svgHtml = tsxToSvgHtml(tsxContent)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${icon.id}</title>
  <script>setTimeout(() => location.reload(), 1500)</script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1a1a2e;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      font-family: monospace;
      padding: 2rem;
    }
    h1 { color: #e0e0e0; font-size: 1.4rem; }
    p.prompt { color: #888; font-size: 0.8rem; max-width: 480px; text-align: center; }
    .sizes {
      display: flex;
      align-items: flex-end;
      gap: 3rem;
    }
    .size-slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .size-label { color: #666; font-size: 0.75rem; }
    .on-dark  { color: #ffffff; }
    .on-light { color: #1a1a1a; background: #f0f0f0; border-radius: 8px; padding: 6px; }
    .pair { display: flex; gap: 1rem; align-items: center; }
  </style>
</head>
<body>
  <h1>${icon.id}</h1>
  <p class="prompt">${icon.prompt}</p>
  <div class="sizes">
    <div class="size-slot">
      <div class="pair">
        <span class="on-dark">${resizeSvg(svgHtml, 256)}</span>
      </div>
      <span class="size-label">256 px</span>
    </div>
    <div class="size-slot">
      <div class="pair">
        <span class="on-dark">${resizeSvg(svgHtml, 64)}</span>
        <span class="on-light">${resizeSvg(svgHtml, 64)}</span>
      </div>
      <span class="size-label">64 px</span>
    </div>
    <div class="size-slot">
      <div class="pair">
        <span class="on-dark">${resizeSvg(svgHtml, 28)}</span>
        <span class="on-light">${resizeSvg(svgHtml, 28)}</span>
      </div>
      <span class="size-label">28 px (default)</span>
    </div>
  </div>
</body>
</html>`
  await writeFile(PREVIEW_PATH, html, 'utf8')
}

async function openBrowser(): Promise<void> {
  await execAsync(`xdg-open "${PREVIEW_PATH}"`).catch(() => {
    console.log(`  Open manually: file://${PREVIEW_PATH}`)
  })
}

// ── CLI helpers ───────────────────────────────────────────────────────────────

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim().toLowerCase())))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!TOKEN) {
    console.error('Error: RECRAFT_API_TOKEN environment variable is required')
    process.exit(1)
  }

  const filter = new Set(process.argv.slice(2))
  const queue = filter.size > 0 ? icons.filter(i => filter.has(i.id)) : icons

  if (queue.length === 0) {
    console.error('No matching icons found.')
    process.exit(1)
  }

  console.log(`Reviewing ${queue.length} icon(s). Keys: [y/Enter] approve  [r] regenerate  [s] skip  [q] quit\n`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let browserOpened = false

  for (let i = 0; i < queue.length; i++) {
    const icon = queue[i]!
    const filePath = join(OUTPUT_DIR, `${icon.id}.tsx`)

    console.log(`[${i + 1}/${queue.length}] ${icon.id}`)

    let tsxContent: string | null = existsSync(filePath) ? await readFile(filePath, 'utf8') : null

    if (!tsxContent) {
      process.stdout.write('  No file found — generating ... ')
      try {
        const svgText = await generateSvg(icon.prompt)
        tsxContent = svgToTsx(icon, svgText)
        await writeFile(filePath, tsxContent, 'utf8')
        console.log('done')
      } catch (e) {
        console.log(`failed: ${(e as Error).message}`)
        console.log('  Skipping.')
        continue
      }
    }

    while (true) {
      try {
        await writePreview(icon, tsxContent)
        if (!browserOpened) {
          await openBrowser()
          browserOpened = true
          await new Promise(r => setTimeout(r, 800))
        }
      } catch (e) {
        console.log(`  Warning: preview failed: ${(e as Error).message}`)
        console.log(`  Open manually: file://${PREVIEW_PATH}`)
      }

      const answer = await ask(rl, '  > ')

      if (answer === 'q') {
        console.log('Quit.')
        rl.close()
        return
      }

      if (answer === 's') {
        console.log('  Skipped.')
        break
      }

      if (answer === 'y' || answer === '') {
        console.log('  Approved ✓')
        break
      }

      if (answer === 'r') {
        process.stdout.write('  Regenerating ... ')
        try {
          const svgText = await generateSvg(icon.prompt)
          tsxContent = svgToTsx(icon, svgText)
          await writeFile(filePath, tsxContent, 'utf8')
          console.log('done')
        } catch (e) {
          console.log(`failed: ${(e as Error).message}`)
        }
        continue
      }

      console.log('  Unknown key. Use y/Enter, r, s, or q.')
    }
  }

  rl.close()
  console.log('\nAll done!')
}

void main()
