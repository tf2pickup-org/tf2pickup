import type { PickDeep } from 'type-fest'
import { PlayerRole, type PlayerModel } from '../../../../database/models/player.model'
import { IconSearch, IconTrash } from '../../../../html/components/icons'
import { playerAvatarUrl } from '../../../../shared/player-avatar-url'
import { Admin } from '../../../views/html/admin'

export type DeletePlayerSummary = PickDeep<
  PlayerModel,
  'steamId' | 'name' | 'roles' | 'avatar.medium'
>

export function DeletePlayerPage(props: {
  query?: string | undefined
  results?: DeletePlayerSummary[] | undefined
}) {
  return (
    <Admin activePage="delete-player">
      <div class="admin-panel-set">
        <div class="bg-abru-dark-6 mb-4 border-l-4 border-red-500 p-4 text-sm">
          <p class="font-bold text-red-400">Warning — this action is irreversible.</p>
          <p class="text-abru-light-50 mt-1">
            Deleting a player permanently removes their profile. The profile page will no longer be
            accessible, and the player will disappear from the player list and the hall of fame.
            Their Steam ID is scrubbed from every game, chat message and the activity log, where
            their name is replaced with a greyed-out "deleted user". The Steam ID is kept only in
            the player action logs for auditing. Super-users cannot be deleted.
          </p>
        </div>

        <form
          class="row flex items-center gap-2"
          hx-get="/admin/delete-player"
          hx-target="#delete-player-results"
          hx-swap="innerHTML"
        >
          <input
            type="text"
            name="q"
            placeholder="Player name or Steam ID"
            value={props.query}
            autocomplete="off"
          />
          <button type="submit" class="button" data-variant="accent" data-size="dense">
            <IconSearch size={20} />
            <span>Search</span>
          </button>
        </form>

        <div id="delete-player-results">
          <DeletePlayerResults query={props.query} results={props.results} />
        </div>
      </div>
    </Admin>
  )
}

export function DeletePlayerResults(props: {
  query?: string | undefined
  results?: DeletePlayerSummary[] | undefined
}) {
  if (props.query === undefined) {
    return <></>
  }

  if (!props.results || props.results.length === 0) {
    return <p class="text-abru-light-50 mt-4">No players found.</p>
  }

  return (
    <div class="mt-4 flex flex-col gap-2">
      {props.results.map(player => (
        <DeletePlayerCard player={player} />
      ))}
    </div>
  )
}

export function DeletePlayerCard(props: { player: DeletePlayerSummary }) {
  const isSuperUser = props.player.roles.includes(PlayerRole.superUser)

  return (
    <form
      class="bg-abru-light-5 flex flex-col gap-3 rounded-lg p-4"
      id={`delete-player-card-${props.player.steamId}`}
    >
      <div class="flex items-center gap-3">
        <img
          src={playerAvatarUrl(props.player.avatar, 'medium')}
          width="48"
          height="48"
          class="h-12 w-12 rounded"
          alt={`${props.player.name}'s avatar`}
        />
        <div class="flex flex-col">
          <a href={`/players/${props.player.steamId}`} class="font-bold" safe>
            {props.player.name}
          </a>
          <span class="text-abru-light-50 text-sm tabular-nums" safe>
            {props.player.steamId}
          </span>
        </div>
      </div>

      {isSuperUser ? (
        <p class="text-abru-light-50 text-sm italic">Super-users cannot be deleted.</p>
      ) : (
        <>
          <label class="text-abru-light-50 text-sm">
            Type the player's nickname or Steam ID to confirm deletion:
            <input
              type="text"
              name="confirmation"
              autocomplete="off"
              class="bg-abru-dark-6! mt-1 w-full"
              required
            />
          </label>
          <div class="flex justify-end">
            <button
              type="submit"
              class="button"
              data-variant="accent"
              data-size="dense"
              hx-delete={`/admin/delete-player/${props.player.steamId}`}
              hx-target={`#delete-player-card-${props.player.steamId}`}
              hx-swap="outerHTML"
              hx-confirm={`Permanently delete ${props.player.name}? This cannot be undone.`}
            >
              <IconTrash size={20} />
              <span>Delete player</span>
            </button>
          </div>
        </>
      )}
    </form>
  )
}

export function DeletePlayerDeleted(props: { name: string }) {
  return (
    <div class="bg-abru-light-5 text-abru-light-50 rounded-lg p-4 text-sm">
      Player{' '}
      <span class="font-bold" safe>
        {props.name}
      </span>{' '}
      has been deleted.
    </div>
  )
}
