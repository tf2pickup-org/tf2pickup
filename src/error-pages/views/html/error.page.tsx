import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function ErrorPage(props: { statusCode: number; message: string }) {
  return (
    <Layout title={makeTitle('Error')}>
      <NavigationBar />
      <Page>
        <div class="flex h-full flex-col items-center justify-center">
          <span class="text-abru-light-75 text-[384px] leading-none font-bold">
            {props.statusCode}
          </span>
          <span class="text-abru-light-75 text-[36px] font-bold" safe>
            {props.message}
          </span>
          <a href="/" class="button button--accent mt-4 px-16">
            Go back home
          </a>
        </div>
      </Page>
      <Footer />
    </Layout>
  )
}
