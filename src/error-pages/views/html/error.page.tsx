import type { User } from '../../../auth/types/user'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'
import { makeTitle } from '../../../html/make-title'

export function ErrorPage(props: { message: string; user?: User | undefined }) {
  return (
    <Layout title={makeTitle('Error')}>
      <NavigationBar user={props.user} />
      <Page>
        <div class="flex h-full flex-row items-center justify-center">
          <span class="my-9 text-[36px] font-bold text-rose-600" safe>
            {props.message}
          </span>
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
