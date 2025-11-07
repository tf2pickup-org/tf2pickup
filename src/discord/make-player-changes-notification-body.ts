import { isEqual } from 'es-toolkit'
import type { PlayerModel } from '../database/models/player.model'

export function makePlayerChangesNotificationBody({
  before,
  after,
}: {
  before: PlayerModel
  after: PlayerModel
}) {
  const changesText = []

  if (before.name !== after.name) {
    changesText.push(makeLine('Name', before.name, after.name))
  }

  if (!isEqual(before.roles, after.roles)) {
    changesText.push(
      makeLine(
        'Roles',
        before.roles.join(', ') || '__none__',
        after.roles.join(', ') || '__none__',
      ),
    )
  }

  if (before.cooldownLevel !== after.cooldownLevel) {
    changesText.push(
      makeLine('Cooldown level', before.cooldownLevel.toString(), after.cooldownLevel.toString()),
    )
  }

  return changesText.join('\n')
}

function makeLine(name: string, before: string, after: string) {
  return `${name}: **${before}** => **${after}**`
}
