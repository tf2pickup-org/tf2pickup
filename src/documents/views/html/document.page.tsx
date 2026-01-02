import type { DocumentModel } from '../../../database/models/document.model'
import { Layout } from '../../../html/layout'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { parse } from 'marked'
import { Page } from '../../../html/components/page'
import { Footer } from '../../../html/components/footer'
import { makeTitle } from '../../../html/make-title'

export function DocumentPage(document: DocumentModel) {
  const safeParsed = parse(document.body ?? '')

  return (
    <Layout title={makeTitle(document.name)}>
      <NavigationBar />
      <Page>
        <div class="container mx-auto">
          <div class="text-abru-light-75 my-9 text-[48px] font-bold capitalize" safe>
            {document.name}
          </div>
          <article class="prose prose-invert mb-16 max-w-none">{safeParsed}</article>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
