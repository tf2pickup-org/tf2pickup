import type { Children } from '@kitajs/html'

export function AdminPanel(props?: { children?: Children }) {
  return <div class="container mx-auto grid grid-cols-5 gap-8">{props?.children}</div>
}

export function AdminPanelSidebar(props?: { children?: Children }) {
  return <div class="flex flex-col gap-y-1">{props?.children}</div>
}

export function AdminPanelSection(props: { children: Children }) {
  return <span class="admin-panel-section">{props.children}</span>
}

export function AdminPanelLink(props: { href: string; active?: boolean; children: Children }) {
  return (
    <a href={props.href} class={['admin-panel-link', props.active && 'active']}>
      {props.children}
    </a>
  )
}

export function AdminPanelBody(props?: { children?: Children }) {
  return <div class="col-span-4">{props?.children}</div>
}

export function AdminPanelHeader(props?: { children?: Children }) {
  return <h1 class="mb-4 text-[32px] text-abru-light-75">{props?.children}</h1>
}

export function AdminPanelContent(props?: { children?: Children }) {
  return <div class="rounded-2xl bg-abru-dark-25 p-8">{props?.children}</div>
}

export function AdminPanelGroup(props?: { children?: Children }) {
  return <div class="rounded-lg bg-abru-light-5">{props?.children}</div>
}
