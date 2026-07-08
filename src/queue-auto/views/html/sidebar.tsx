import type { User } from '../../../auth/types/user'
import type { Gamemode } from '../../../shared/types/gamemode'
import { IconMessageCircle, IconUserCircle } from '../../../html/components/icons'
import { Chat } from './chat'
import { CurrentPlayerCount } from './current-player-count'
import { OnlinePlayerCount } from './online-player-count'
import { OnlinePlayerList } from './online-player-list'

export function Sidebar(props: { user?: User | undefined; gamemode: Gamemode; required: number }) {
  return (
    <div class="queue-sidebar">
      <div class="tab" data-tabs data-tabs-persist="queue-sidebar">
        <button class="tab-link lg:hidden" data-tabs-select="queue-content">
          <span>
            Queue (<CurrentPlayerCount gamemode={props.gamemode} />/{props.required})
          </span>
        </button>

        <button class="tab-link" data-tabs-select="tab-online-player-list">
          <IconUserCircle size={18} />
          <OnlinePlayerCount />
        </button>

        <button class="tab-link" data-tabs-select="tab-chat">
          <IconMessageCircle size={18} />
          <span>Chat</span>
        </button>
      </div>

      <div class="tab-content" id="tab-online-player-list">
        <OnlinePlayerList />
      </div>

      <div class="tab-content" id="tab-chat" style="display:none">
        <Chat user={props.user} />
      </div>
    </div>
  )
}
