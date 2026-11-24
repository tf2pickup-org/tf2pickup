import { collections } from '../../../../database/collections'
import { errors } from '../../../../errors'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'

const documents = [
  { name: 'rules', title: 'Rules', path: '/admin/rules' },
  { name: 'privacy policy', title: 'Privacy policy', path: '/admin/privacy-policy' },
]

export async function DocumentsPage(props: { name: string }) {
  const doc = await collections.documents.findOne({ name: props.name })
  if (!doc) {
    throw errors.notFound(`document not found: ${props.name}`)
  }

  return (
    <Admin activePage="rules">
      <nav class="admin-tabs" aria-label="Documents">
        {documents.map(({ name, title, path }) => (
          <a href={path} aria-current={name === props.name ? 'page' : undefined} safe>
            {title}
          </a>
        ))}
      </nav>
      <form action="" method="post" class="flex flex-col gap-4" data-save-bar>
        <div class="admin-panel-set flex flex-col gap-2">
          <label for="documentBody" class="text-sm text-zinc-400">
            Markdown, shown to players as written.
          </label>
          <textarea id="documentBody" class="h-[65dvh] min-h-64" name="body" safe>
            {doc.body}
          </textarea>
        </div>
        <SaveBar />
      </form>
    </Admin>
  )
}
