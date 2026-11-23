import type { Children } from '@kitajs/html'

export function SettingCard(props: { title: string; description?: string; children: Children }) {
  return (
    <section class="admin-panel-set setting-card">
      <h2 class="setting-card-title" safe>
        {props.title}
      </h2>
      {!!props.description && (
        <p class="setting-card-description" safe>
          {props.description}
        </p>
      )}
      {props.children}
    </section>
  )
}
