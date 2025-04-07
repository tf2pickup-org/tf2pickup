import htmx from './htmx'
import 'htmx-ext-ws'
import 'htmx-ext-preload'
import 'htmx-ext-head-support'
import 'htmx-ext-remove-me'

// internal htmx extensions
import './copy-to-clipboard'
import './notifications'
import './play-sound'

import * as hyperscript from 'hyperscript.org'
hyperscript.browserInit()

import './idiomorph.ts'

htmx.config.wsReconnectDelay = () => 1000 // 1 second

import './countdown'
import './disable-when-offline'
import './fade-scroll'
import './flash-message'
import './map-thumbnail'
import './tabs'

export { goTo } from './navigation'
