import { configuration } from '../../../../configuration'
import type { PlayerSkillSuggestions } from '../../../../players/collect-skill-suggestions'
import { collectSkillSuggestions } from '../../../../players/collect-skill-suggestions'
import { Admin } from '../../../views/html/admin'
import { GameClassIcon } from '../../../../html/components/game-class-icon'
import type { Tf2ClassName } from '../../../../shared/types/tf2-class-name'

export async function SkillSuggestionsPage() {
  const enabled = await configuration.get('games.skill_suggestions')
  return (
    <Admin activePage="skill-suggestions">
      <div class="admin-panel-set flex flex-col gap-4">
        {enabled ? <Suggestions /> : <FeatureDisabled />}
      </div>
    </Admin>
  )
}

function FeatureDisabled() {
  return (
    <p class="text-abru-light-75">
      Skill suggestions are disabled. Enable them in{' '}
      <a href="/admin/player-restrictions" class="underline">
        Player restrictions
      </a>
      .
    </p>
  )
}

async function Suggestions() {
  const [all, skillStep, defaultSkill] = await Promise.all([
    collectSkillSuggestions(),
    configuration.get('games.skill_step'),
    configuration.get('games.default_player_skill'),
  ])

  if (all.length === 0) {
    return <p class="text-abru-light-75">No pending skill suggestions.</p>
  }

  return (
    <>
      <p class="text-abru-light-75 text-sm">
        Players whose game results consistently diverge from their assigned skill, based on
        per-class elo tracked from every ended game. Applying a suggestion adjusts the player's
        skill by the configured skill step.
      </p>
      <table class="w-full text-sm">
        <thead>
          <tr class="border-abru-dark-29 border-b">
            <th class="p-2 text-left">Player</th>
            <th class="p-2 text-center">Class</th>
            <th class="p-2 text-center">Current skill</th>
            <th class="p-2 text-center">Elo</th>
            <th class="p-2 text-center">Games on class</th>
            <th class="p-2 text-right">Suggestion</th>
          </tr>
        </thead>
        <tbody>
          {all.flatMap(({ player, suggestions }) =>
            [...suggestions.entries()].map(([gameClass, direction]) => (
              <SuggestionRow
                player={player}
                gameClass={gameClass}
                direction={direction}
                skillStep={skillStep}
                currentSkill={player.skill?.[gameClass] ?? defaultSkill[gameClass] ?? 0}
              />
            )),
          )}
        </tbody>
      </table>
    </>
  )
}

function SuggestionRow(props: {
  player: PlayerSkillSuggestions['player']
  gameClass: Tf2ClassName
  direction: 'up' | 'down'
  skillStep: number
  currentSkill: number
}) {
  const { player, gameClass, direction, skillStep, currentSkill } = props
  const isUp = direction === 'up'
  const newSkill = isUp ? currentSkill + skillStep : currentSkill - skillStep
  return (
    <tr class="border-abru-dark-29 border-b">
      <td class="p-2">
        <a href={`/players/${player.steamId}`} class="hover:underline" safe>
          {player.name}
        </a>
      </td>
      <td class="p-2 text-center">
        <GameClassIcon gameClass={gameClass} size={24} />
      </td>
      <td class="p-2 text-center">{currentSkill}</td>
      <td class="p-2 text-center">{player.elo?.[gameClass]}</td>
      <td class="p-2 text-center">{player.stats.gamesByClass[gameClass] ?? 0}</td>
      <td class="p-2 text-right">
        <form method="post" action="" class="inline-block">
          <input type="hidden" name="steamId" value={player.steamId} />
          <input type="hidden" name="gameClass" value={gameClass} />
          <input type="hidden" name="direction" value={direction} />
          <button
            type="submit"
            class="button compact"
            data-variant="accent"
            title={isUp ? 'Skill too low' : 'Skill too high'}
            data-umami-event="apply-skill-suggestion"
            data-umami-event-player={player.steamId}
          >
            <span class={isUp ? 'text-yellow-500' : 'text-orange-500'}>
              {(isUp ? '↑' : '↓') as 'safe'}
            </span>
            <span>
              {currentSkill} → {newSkill}
            </span>
          </button>
        </form>
      </td>
    </tr>
  )
}
