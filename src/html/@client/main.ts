import htmx from './htmx'
import 'htmx-ext-ws'
import 'htmx-ext-preload'
import 'htmx-ext-head-support'
import 'htmx-ext-remove-me'

// internal htmx extensions
import './copy-to-clipboard'
import './countdown'
import './notifications'
import './play-sound'
import './sync-attribute'

import 'hyperscript.org'

htmx.config.wsReconnectDelay = () => 1000 // 1 second

import './disable-when-offline'
import './fade-scroll'
import './flash-message'
import './map-thumbnail'
import './mention-completion'
import './mention-notification'
import './details-persist'
import './tabs'

export { goTo } from './navigation'
