import Html from '@kitajs/html'

export function Page(props: Html.PropsWithChildren) {
  return <main class="flex-1">{props.children}</main>
}
