import type { User } from '../../../auth/types/user'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function ErrorPage(props: { statusCode: number; message: string; user?: User | undefined }) {
  return (
    <Layout title={makeTitle('Error')}>
      <NavigationBar user={props.user} />
      <Page>
        <div class="flex h-full flex-col items-center justify-center">
          <span class="text-[384px] font-bold leading-none text-abru-light-75" safe>
            {props.statusCode}
          </span>
          <span class="text-[36px] font-bold text-abru-light-75" safe>
            {props.message}
          </span>
          <a href="/" class="button button--accent mt-4 px-16">
            Go back home
          </a>
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
