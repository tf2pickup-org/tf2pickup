import type { WithId } from 'mongodb'
import type { ChatMessageModel } from '../../database/models/chat-message.model'
import { OnlinePlayerList } from '../views/html/online-player-list'
import { OnlinePlayerCount } from '../views/html/online-player-count'
import { StreamList } from '../views/html/stream-list'
import { SubstitutionRequests } from '../views/html/substitution-requests'
import { ChatMessages } from '../views/html/chat'
import { BanAlerts } from '../views/html/ban-alerts'
import { RunningGameSnackbar } from '../views/html/running-game-snackbar'
import { PreReadyUpButton } from '../../pre-ready/views/html/pre-ready-up-button'
import type { Fragment } from './send-to-pages'

export interface SharedParts {
  onlinePlayers?: boolean
  streams?: boolean
  substitutionRequests?: boolean
  chat?:
    | 'all'
    | { append: WithId<ChatMessageModel>; previousMessageAt?: Date | undefined }
    | { remove: string }
  banAlerts?: boolean
  preReady?: boolean
  runningGame?: boolean
}

// What every queue page shows, whichever queue it is for.
export function sharedParts(parts: SharedParts): Fragment[] {
  const fragments: Fragment[] = []
  const once =
    (html: JSX.Element): Fragment =>
    () =>
      html

  if (parts.substitutionRequests) {
    fragments.push(once(SubstitutionRequests()))
  }

  if (parts.onlinePlayers) {
    fragments.push(once(OnlinePlayerCount()), once(OnlinePlayerList()))
  }

  if (parts.streams) {
    fragments.push(once(StreamList()))
  }

  const { chat } = parts
  if (chat) {
    // the chat is shown to signed-in players only
    const html =
      chat === 'all'
        ? ChatMessages()
        : 'append' in chat
          ? ChatMessages.append({ message: chat.append, previousMessageAt: chat.previousMessageAt })
          : ChatMessages.remove(chat.remove)
    fragments.push(({ steamId }) => steamId !== undefined && html)
  }

  if (parts.runningGame) {
    fragments.push(async ({ steamId, actor }) =>
      steamId ? RunningGameSnackbar({ gameNumber: (await actor())?.activeGame }) : undefined,
    )
  }

  if (parts.preReady) {
    fragments.push(({ steamId }) => (steamId ? PreReadyUpButton({ actor: steamId }) : undefined))
  }

  if (parts.banAlerts) {
    fragments.push(({ steamId }) => (steamId ? BanAlerts({ actor: steamId }) : undefined))
  }

  return fragments
}
