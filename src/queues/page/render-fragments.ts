import type { Fragment, Viewer } from './send-to-pages'

export async function renderFragments(fragments: Fragment[], viewer: Viewer): Promise<string[]> {
  const html = await Promise.all(fragments.map(async fragment => await fragment(viewer)))
  return html.filter((item): item is string => !!item)
}
