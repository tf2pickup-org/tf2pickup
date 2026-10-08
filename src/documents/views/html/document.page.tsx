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
      <NavigationBar wide />
      <Page>
        <div class="mx-auto mb-16 w-full max-w-[1254px]">
          <h1 class="page-title capitalize lg:mt-[93px]" safe>
            {document.name}
          </h1>
          <article class="prose prose-invert prose-zinc mt-5 max-w-none text-[#c7c4c7]">
            {safeParsed}
          </article>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
