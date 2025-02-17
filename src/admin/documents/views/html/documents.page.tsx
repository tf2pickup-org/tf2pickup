import type { User } from '../../../../auth/types/user'
import { collections } from '../../../../database/collections'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function DocumentsPage(props: { user: User; name: string }) {
  const doc = await collections.documents.findOne({ name: props.name })
  if (!doc) {
    throw new Error(`document not found: ${props.name}`)
  }

  const safeBody = doc.body
  return (
    <Admin
      activePage={props.name.replace(' ', '-') as 'rules' | 'privacy-policy'}
      user={props.user}
    >
      <form action="" method="post" class="admin-panel-set flex h-full flex-col gap-2">
        <textarea class="grow" name="body">
          {safeBody}
        </textarea>

        <p>
          <SaveButton />
        </p>
      </form>
    </Admin>
  )
}
