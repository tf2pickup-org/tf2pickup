import Html from '@kitajs/html'

export function Page(props: Html.PropsWithChildren) {
  return <main class="flex-1 p-2 lg:p-0">{props.children}</main>
}
