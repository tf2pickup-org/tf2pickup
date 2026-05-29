import { goTo } from './navigation.js'
import { onLoadWithAttr } from './on-load-with-attr.js'

onLoadWithAttr('data-queue-mode-changed', () => {
  void goTo('/')
})
