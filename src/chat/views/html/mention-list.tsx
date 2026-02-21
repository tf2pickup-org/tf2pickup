import type { OnlinePlayerModel } from '../../../database/models/online-player.model'

export function MentionList(props: { players: OnlinePlayerModel[] }) {
  if (props.players.length === 0) {
    return <></>
  }

  return (
    <ul class="mention-list" id="mention-list">
      {props.players.map((player, index) => (
        <li data-name={player.name} aria-selected={index === 0 ? 'true' : undefined}>
          <img src={player.avatar} class="size-5 rounded-full" alt="" />
          <span safe>{player.name}</span>
        </li>
      ))}
    </ul>
  )
}
