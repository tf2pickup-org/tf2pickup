import { IconMessageCircle, IconUserCircle } from '../../../html/components/icons'
import { Chat } from './chat'
import { OnlinePlayerCount } from './online-player-count'
import { OnlinePlayerList } from './online-player-list'

export function Sidebar() {
  return (
    <div class="queue-sidebar">
      <div class="tab" data-tabs>
        <button class="tablink" data-tabs-select="online-player-list">
          <IconUserCircle size={18} />
          <OnlinePlayerCount />
        </button>

        <button class="tablink" data-tabs-select="chat">
          <IconMessageCircle size={18} />
          <span>Chat</span>
        </button>
      </div>

      <OnlinePlayerList />
      <Chat />
    </div>
  )
}
