export function navigationBar() {
  return (
    <nav class="flex h-[95px] flex-row justify-center">
    <div class="container flex flex-row items-center justify-between">
      <a href="/" class="mx-4 self-center md:mx-1">
        <img alt="tf2pickup.org logo" src="/logo.png" height="120" class="h-[44px]" />
      </a>

      <div class="hidden flex-row items-center gap-5 font-medium lg:flex">
        {menu()}
      </div>
    </div>
    </nav>
  )
}

function menu() {
  return (
    <div class="flex flex-col gap-[10px] px-4 lg:flex-row lg:items-center lg:px-0">

  </div>
  )
}
