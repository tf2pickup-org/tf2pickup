import { StaticGameServerList } from '../../../static-game-servers/views/html/static-game-server-list'
import { servemeTf } from '../../../serveme-tf'
import { ServemeTfServerList } from '../../../serveme-tf/views/html/serveme-tf-server-list'
import type { GameNumber } from '../../../database/models/game.model'

export async function ChooseGameServerDialog(props: { gameNumber: GameNumber }) {
  return (
    <dialog
      id="choose-game-server-dialog"
      class="bg-abru-dark-29 text-abru-light-75 rounded-xl p-10 shadow-xl xl:min-w-[480px]"
      hx-on-open="document.getElementById('choose-game-server-dialog').showModal()"
      hx-on-close="document.getElementById('choose-game-server-dialog').close()"
    >
      <form hx-put={`/games/${props.gameNumber}/reassign-gameserver`} class="flex flex-col">
        <header class="font-bold">Choose game server</header>
        <StaticGameServerList name="gameServer" />
        {servemeTf.isEnabled && <ServemeTfServerList />}
        <button class="button button--accent mt-8 self-center">Select</button>
      </form>
    </dialog>
  )
}
