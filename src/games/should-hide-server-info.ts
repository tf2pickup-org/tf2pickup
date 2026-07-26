import { configuration } from '../configuration'
import { GameServerProvider, type GameModel } from '../database/models/game.model'
import { HideServerInfoMode } from '../shared/types/hide-server-info-mode'

export async function shouldHideServerInfo(game: Pick<GameModel, 'gameServer'>): Promise<boolean> {
  const mode = await configuration.get('games.hide_server_info_from_spectators')
  switch (mode) {
    case HideServerInfoMode.never:
      return false
    case HideServerInfoMode.always:
      return true
    case HideServerInfoMode.auto:
      return game.gameServer?.provider !== GameServerProvider.servemeTf
  }
}
