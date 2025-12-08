import { collections } from '../../../../database/collections'
import { errors } from '../../../../errors'
import { Admin } from '../../../views/html/admin'
import { SaveButton } from '../../../views/html/save-button'

export async function DocumentsPage(props: { name: string }) {
  const doc = await collections.documents.findOne({ name: props.name })
  if (!doc) {
    throw errors.notFound(`document not found: ${props.name}`)
  }

  const safeBody = doc.body
  return (
    <Admin activePage={props.name.replace(' ', '-') as 'rules' | 'privacy-policy'}>
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
