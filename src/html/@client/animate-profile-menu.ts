import { animate } from 'motion'

interface AnimateProfileMenuProps {
  profileMenu: HTMLElement
  icon: HTMLElement
  iconWrapper: HTMLElement
  iconOverlay: HTMLElement
  openButton: HTMLElement
}

export function animateProfileMenu(props: AnimateProfileMenuProps) {
  const closeProfileMenu = async () => {
    const opts = { duration: 0.1, ease: 'easeInOut' }
    animate(props.iconWrapper, { rotate: 0 }, opts)
    animate(props.icon, { opacity: 100 }, opts)
    animate(props.iconOverlay, { opacity: 0 }, opts)
    await animate(props.profileMenu, { scaleY: [1, 0] }, opts)
    props.profileMenu.style.display = 'none'
  }

  props.openButton.addEventListener('click', event => {
    event.preventDefault()
    if (props.profileMenu.style.display === 'none') {
      props.profileMenu.style.display = 'block'
      const opts = { duration: 0.15, ease: 'easeInOut' }
      animate(props.profileMenu, { scaleY: [0, 1] }, opts)
      animate(props.iconWrapper, { rotate: 45 }, opts)
      animate(props.icon, { opacity: 0 }, opts)
      animate(props.iconOverlay, { opacity: 100 }, opts)

      setTimeout(() => {
        document.body.addEventListener('click', closeProfileMenu, { once: true })
      })
    }
  })
}
