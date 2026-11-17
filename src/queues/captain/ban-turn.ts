import type { CaptainDraftModel } from '../../database/models/captain-draft.model'
import { Tf2Team } from '../../shared/types/tf2-team'

export function banTurn(draft: Pick<CaptainDraftModel, 'mapOptions' | 'bans'>) {
  const remaining = draft.mapOptions.filter(map => !draft.bans.some(ban => ban.map === map))
  return {
    remaining,
    team: draft.bans.length % 2 === 0 ? Tf2Team.blu : Tf2Team.red,
    index: draft.bans.length,
  }
}
