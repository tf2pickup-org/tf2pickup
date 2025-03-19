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
}) {
  return (
    <div class="flex h-12 flex-row flex-nowrap items-center gap-2 text-lg text-white">
      <a
        href={props.hrefFn(props.currentPage - 1)}
        class={['page', props.currentPage <= 1 && 'page--disabled']}
        preload="mousedown"
      >
        <IconChevronLeft />
      </a>

      {props.around.map(page => (
        <a
          href={props.hrefFn(page)}
          class={['page', props.currentPage === page && 'page--active']}
          preload="mousedown"
        >
          <span class="px-[10px]">{page}</span>
        </a>
      ))}

      <a
        href={props.hrefFn(props.currentPage + 1)}
        class={['page', props.currentPage >= props.lastPage && 'page--disabled']}
        preload="mousedown"
      >
        <IconChevronRight />
      </a>
    </div>
  )
}
