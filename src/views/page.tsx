export function Page(props: Html.PropsWithChildren) {
  return (
    <div class="container mx-auto grid gap-x-4 gap-y-8 p-2 lg:grid-cols-4 lg:p-0">
      {props.children}
    </div>
  )
}
