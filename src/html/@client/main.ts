import htmx from './htmx'
import 'htmx-ext-ws'
import 'htmx-ext-preload'
import 'htmx-ext-head-support'
import 'htmx-ext-remove-me'

import * as hyperscript from 'hyperscript.org'
hyperscript.browserInit()

import './idiomorph.ts'

htmx.config.wsReconnectDelay = () => 1000 // 1 second

import './countdown'
import './disable-when-offline'
import './fade-scroll'
import './flash-message'
import './map-thumbnail'
import './notification'

export { goTo } from './navigation'
