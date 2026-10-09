import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function ErrorPage(props: { statusCode: number; message: string }) {
  return (
    <Layout title={makeTitle('Error')}>
      <NavigationBar wide />
      <Page>
        <div class="page-wide flex h-full flex-col items-center justify-center gap-6 text-center">
          <span class="text-[160px] leading-none font-bold text-zinc-800 tabular-nums lg:text-[240px]">
            {props.statusCode}
          </span>
          <h1 class="page-title mt-0!" safe>
            {props.message}
          </h1>
          <div class="page-actions">
            <a href="/" class="button" data-variant="accent">
              Go back home
            </a>
          </div>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
