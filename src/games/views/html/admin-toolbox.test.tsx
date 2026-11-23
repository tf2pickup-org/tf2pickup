import { describe, expect, it } from 'vitest'
import { AdminToolbox } from './admin-toolbox'
import { GameState } from '../../../database/models/game.model'
import type { GameModel, GameNumber } from '../../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../../database/models/game-slot.model'
import type { GameSlotId } from '../../../shared/types/game-slot-id'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const render = (skill: number | undefined) =>
  AdminToolbox({
    game: {
      number: 1 as GameNumber,
      gamemode: Gamemode.sixes,
      map: 'cp_badlands',
      state: GameState.ended,
      slots: [
        {
          id: 'red-soldier-0' as GameSlotId,
          player: '76561198000000001' as SteamId64,
          team: Tf2Team.red,
          gameClass: Tf2ClassName.soldier,
          status: SlotStatus.active,
          connectionStatus: PlayerConnectionStatus.offline,
          ...(skill === undefined ? {} : { skill }),
        },
      ],
      events: [] as unknown as GameModel['events'],
    } as GameModel,
  }) as string

describe('AdminToolbox', () => {
  it('hides the show skills toggle when no slot has a skill', () => {
    expect(render(undefined)).not.toContain('show-assigned-skills')
  })

  it('shows the show skills toggle when slots have skills', () => {
    expect(render(5)).toContain('id="show-assigned-skills"')
  })
})
