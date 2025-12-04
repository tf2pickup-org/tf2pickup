import { resolve } from "path";
import type { User } from "../../../../auth/types/user";
import { collections } from "../../../../database/collections";
import { bundle } from "../../../../html/bundle";
import { queue } from "../../../../queue";
import { Admin } from "../../../views/html/admin";

export async function PlayerSkillTablePage(props: { user: User }) {
  const mainJs = await bundle(resolve(import.meta.dirname, '@client', 'main.ts'))
  const data = (await collections.players.find({}).toArray()).map(player => ({
    name: player.name,
    steamId: player.steamId,
    ...queue.config.classes.reduce((acc, gameClass) => ({ ...acc, [gameClass.name]: player.skill?.[gameClass.name] ?? 0 }), {}),
  }))

  const headerData = [
    { field: 'name', headerName: 'Player' },
    { field: 'steamId', headerName: 'Steam ID', sortable: false },
    ...queue.config.classes.map(gameClass => ({ field: gameClass.name, sortable: true, editable: true })),
  ]

  return (
    <Admin activePage="player-skills" user={props.user}>
      <div class="admin-panel-set">
        <div id="playerSkillTable" style="height: calc(100vh - 400px);"></div>
        <script type="module">
          {`
          import { makePlayerSkillTable } from '${mainJs}';
          makePlayerSkillTable(document.getElementById('playerSkillTable'), ${JSON.stringify(headerData)}, ${JSON.stringify(data)});
          `}
        </script>
      </div>
    </Admin>
  )
}
