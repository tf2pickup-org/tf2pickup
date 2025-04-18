import { collections } from '../../../database/collections'

export async function StaticGameServerList(props: { name: string }) {
  const gameServers = await collections.staticGameServers
    .find({ isOnline: true, game: { $exists: false } })
    .toArray()
  return (
    <>
      <p class="my-2">Static game servers</p>
      {gameServers.length > 0 ? (
        <ul>
          {gameServers.map(gameServer => (
            <li>
              <label>
                <input type="radio" name={props.name} value={`static:${gameServer.id}`} />
                <span class="ms-2" safe>
                  {gameServer.name}
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <span>No free game servers available</span>
      )}
    </>
  )
}
