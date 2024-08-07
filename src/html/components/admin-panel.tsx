import type { Children } from '@kitajs/html'

export function AdminPanel(props?: { children?: Children }) {
  return <div class="container mx-auto grid grid-cols-6 gap-8">{props?.children}</div>
}

export function AdminPanelSidebar(props?: { children?: Children }) {
  return <div class="flex flex-col gap-y-1">{props?.children}</div>
}

export function AdminPanelLink(props: { href: string; active?: boolean; children: Children }) {
  return (
    <a href={props.href} class={['admin-panel-link', props.active && 'active']}>
      {props.children}
    </a>
  )
}

export function AdminPanelBody(props?: { children?: Children }) {
  return <div class="col-span-5">{props?.children}</div>
}

export function AdminPanelHeader(props?: { children?: Children }) {
  return <h1 class="text-[32px] text-abru-light-75 mb-6">{props?.children}</h1>
}

export function AdminPanelContent(props?: { children?: Children }) {
  return <div class="bg-abru-dark-25 rounded-2xl p-8">{props?.children}</div>
}

export function AdminPanelGroup(props?: { children?: Children }) {
  return <div class="bg-abru-light-5 rounded-lg">{props?.children}</div>
}
