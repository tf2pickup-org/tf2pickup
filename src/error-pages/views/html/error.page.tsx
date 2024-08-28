import type { User } from '../../../auth/types/user'
import { Footer } from '../../../html/components/footer'
import { NavigationBar } from '../../../html/components/navigation-bar'
import { Page } from '../../../html/components/page'
import { Layout } from '../../../html/layout'

export function ErrorPage(props: { message: string; user?: User | undefined }) {
  return (
    <Layout title="error">
      <NavigationBar user={props.user} />
      <Page>
        <div class="container mx-auto text-center">
          <span class="text-rose-600 my-9 text-[48px] font-bold" safe>
            {props.message}
          </span>
        </div>
      </Page>
      <Footer user={props.user} />
    </Layout>
  )
}
