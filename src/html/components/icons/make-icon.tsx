import type { IconProps } from './icon-props'

export function makeIcon(name: string, svgContent: JSX.Element): (props: IconProps) => JSX.Element {
  return (props: IconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={props.stroke ?? 2}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={['icon icon-tabler icons-tabler-outline', `icon-tabler-${name}`]}
    >
      {svgContent}
    </svg>
  )
}
