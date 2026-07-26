/**
 * The number of players currently queued, in whichever mode is active. Each
 * mode owns the query (different collections); this owns the element id both
 * modes' websocket broadcasts swap into.
 */
export function QueuePlayerCount(props: { count: number }) {
  return <span id="queue-current-player-count">{props.count}</span>
}
