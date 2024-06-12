import type { User } from '../../../auth/types/user'
import type { DocumentModel } from '../../../database/models/document.model'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { parse } from 'marked'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'

export function DocumentPage(document: DocumentModel, user?: User) {
  const safeParsed = parse(document.body ?? '')

  return (
    <Layout title={document.name}>
      <NavigationBar user={user} />
      <Page>
        <div class="container mx-auto">
          <div class="text-abru-light-75 my-9 text-[48px] font-bold capitalize" safe>
            {document.name}
          </div>
          <article class="prose prose-invert mb-16 max-w-none">{safeParsed}</article>
        </div>
      </Page>
      <Footer user={user} />
    </Layout>
  )
}
