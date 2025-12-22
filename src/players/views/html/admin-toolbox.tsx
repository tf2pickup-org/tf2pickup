import { capitalize } from 'es-toolkit'
import { configuration } from '../../../configuration'
import type { PlayerModel } from '../../../database/models/player.model'
import {
  IconChartDots,
  IconDeviceFloppy,
  IconEdit,
  IconInputX,
} from '../../../html/components/icons'
import { queue } from '../../../queue'
import { WinLossChart } from './win-loss-chart'
import { GameClassSkillInput } from '../../../html/components/game-class-skill-input'
import { bySteamId } from '../../by-steam-id'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { bundle } from '../../../html/bundle'
import { resolve } from 'path'

export async function AdminToolbox(props: { player: Pick<PlayerModel, 'skill' | 'steamId'> }) {
  const { player } = props
  const defaultSkill = await configuration.get('games.default_player_skill')

  return (
    <>
      <form
        method="post"
        action={`/players/${player.steamId}/edit/skill`}
        class="player-admin-toolbox"
      >
        <h4 class="caption" style="grid-area: captionSkill">
          Skill
        </h4>
        <h4 class="caption" style="grid-area: captionWinLoss">
          Win-loss chart
        </h4>

        {queue.config.classes.map(gameClass => (
          <GameClassSkillInput
            gameClass={gameClass.name}
            name={`skill.${gameClass.name}`}
            value={player.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0}
            style={`grid-area: skill${capitalize(gameClass.name)}`}
          />
        ))}

        <button type="submit" class="button button--accent" style="grid-area: buttonSave">
          <IconDeviceFloppy size={20} />
          <span>Save</span>
        </button>

        <button
          type="button"
          class="button"
          style="grid-area: buttonReset"
          hx-get={`/players/${player.steamId}/edit/skill/default`}
          hx-trigger="click"
          hx-disabled-elt="this"
          hx-swap="none"
        >
          <IconInputX size={20} />
          <span class="sr-only">Reset</span>
          <span class="lg:hidden">Reset</span>
        </button>

        <button type="button" class="button" style="grid-area: buttonSkillHistory">
          <IconChartDots size={20} />
          <span class="sr-only">Skill history</span>
          <span class="lg:hidden">Skill history</span>
        </button>

        <div class="mx-2" style="grid-area: winLoss">
          <WinLossChart steamId={props.player.steamId} />
        </div>

        <a
          href={`/players/${player.steamId}/edit`}
          class="button button--accent self-center whitespace-nowrap"
          style="grid-area: linkEdit"
        >
          <IconEdit />
          Edit player
        </a>
      </form>
      <SkillHistory steamId={player.steamId} />
    </>
  )
}

AdminToolbox.replaceSkillValues = async (props: { skill?: PlayerModel['skill'] }) => {
  const defaultSkill = await configuration.get('games.default_player_skill')
  return (
    <>
      {queue.config.classes.map(gameClass => {
        const s = props.skill?.[gameClass.name] ?? defaultSkill[gameClass.name] ?? 0
        return (
          <input
            type="number"
            id={`playerSkill${gameClass.name}`}
            hx-swap-oob="true"
            name={`skill.${gameClass.name}`}
            value={s.toString()}
            required
            step="1"
          />
        )
      })}
    </>
  )
}

async function SkillHistory(props: { steamId: SteamId64 }) {
  const skillHistory = (await bySteamId(props.steamId, ['skillHistory'])).skillHistory
  const data = toChartData(skillHistory)
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))

  return (
    <>
      <canvas id="skillHistory" aria-label="Skill history chart" role="img"></canvas>
      <script type="module">
        {`
        import { makeSkillHistoryChart } from '${mainJs}';

        const data = ${JSON.stringify(data)};
        makeSkillHistoryChart(document.getElementById('skillHistory'), data);
        `}
      </script>
    </>
  )
}

function toChartData(data: PlayerModel['skillHistory']) {
  if (!data) {
    return {
      labels: [],
      datasets: [
        {
          label: 'skill',
          data: [],
          backgroundColor: '#F61059',
        },
      ],
    }
  }

  return {
    labels: data.map(d => d.at.toLocaleString()),
    datasets: [
      {
        label: 'scout',
        data: data.map(d => d.skill.scout),
        backgroundColor: '#FAFF00',
      },
      {
        label: 'soldier',
        data: data.map(d => d.skill.soldier),
        backgroundColor: '#A17BCC',
      },
      {
        label: 'demoman',
        data: data.map(d => d.skill.demoman),
        backgroundColor: '#FFCAE9',
      },
      {
        label: 'medic',
        data: data.map(d => d.skill.medic),
        backgroundColor: '#F61059',
      },
    ],
  }
}
