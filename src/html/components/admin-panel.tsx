import type { Children } from '@kitajs/html'

export function AdminPanel(props?: { children?: Children }) {
  return <div class="admin-panel page-wide">{props?.children}</div>
}

export function AdminPanelSidebar(props?: { children?: Children }) {
  return (
    <div class="admin-panel-sidebar">
      {props?.children}
      <script>{`
        if (!window.matchMedia('(min-width: 64rem)').matches) {
          document.currentScript.parentElement
            .querySelector('.admin-panel-link.active')
            ?.scrollIntoView({ block: 'nearest', inline: 'center' });
        }
      `}</script>
    </div>
  )
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
  return <div class="admin-panel-body">{props?.children}</div>
}

export function AdminPanelHeader(props?: { children?: Children }) {
  return <h1 class="admin-panel-title">{props?.children}</h1>
}

export function AdminPanelContent(props?: { children?: Children }) {
  return <div class="admin-panel-content">{props?.children}</div>
}

export function AdminPanelGroup(props?: { children?: Children }) {
  return <div class="admin-panel-set">{props?.children}</div>
}
