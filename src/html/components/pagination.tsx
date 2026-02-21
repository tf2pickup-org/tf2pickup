import { IconChevronLeft, IconChevronRight } from './icons'

export interface Paginated {
  last: number
  around: number[]
}

const range = 2

export const paginate = (
  currentPage: number,
  itemsPerPage: number,
  itemCount: number,
): Paginated => {
  const links: number[] = []
  const last = Math.ceil(itemCount / itemsPerPage)

  let from = Math.max(currentPage - range, 1)
  const to = Math.min(from + range * 2, last)
  from = Math.max(to - range * 2, 1)

  for (let i = from; i <= to; ++i) {
    links.push(i)
  }

  return {
    last,
    around: links,
  }
}

export function Pagination(props: {
  lastPage: number
  currentPage: number
  around: number[]
  hrefFn: (page: number) => string
  hxTarget?: string
}) {
  return (
    <div class="flex h-12 flex-row flex-nowrap items-center gap-2 text-lg text-white">
      <a
        href={props.hrefFn(props.currentPage - 1)}
        class={['pagination-page', props.currentPage <= 1 && 'pagination-page--disabled']}
        preload="mousedown"
        {...(props.hxTarget && { 'hx-target': props.hxTarget })}
      >
        <IconChevronLeft />
      </a>

      {props.around.map(page => (
        <a
          href={props.hrefFn(page)}
          class={['pagination-page', props.currentPage === page && 'pagination-page--active']}
          preload="mousedown"
          {...(props.hxTarget && { 'hx-target': props.hxTarget })}
        >
          <span class="px-[10px]">{page}</span>
        </a>
      ))}

      <a
        href={props.hrefFn(props.currentPage + 1)}
        class={[
          'pagination-page',
          props.currentPage >= props.lastPage && 'pagination-page--disabled',
        ]}
        preload="mousedown"
        {...(props.hxTarget && { 'hx-target': props.hxTarget })}
      >
        <IconChevronRight />
      </a>
    </div>
  )
}
