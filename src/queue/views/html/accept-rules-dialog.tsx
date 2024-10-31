import { parse } from 'marked'
import type { User } from '../../../auth/types/user'
import { collections } from '../../../database/collections'
import { logger } from '../../../logger'

export async function AcceptRulesDialog(props: { actor?: User | undefined }) {
  if (!props.actor) {
    return <></>
  }

  if (props.actor.player.hasAcceptedRules) {
    return <></>
  }

  const rules = await collections.documents.findOne({ name: 'rules' })
  if (!rules) {
    logger.warn(`rules document not found`)
    return <></>
  }

  if (!rules.body) {
    return <></>
  }

  const safeRules = parse(rules.body)

  return (
    <dialog
      title="Accept rules dialog"
      class="accept-rules-dialog"
      _={`
        init me.showModal() end
      `}
    >
      <div class="flex flex-col gap-6">
        <div class="rules-wrapper fade-scroll">
          <article class="prose prose-invert mb-16 max-w-none">{safeRules}</article>
        </div>

        <div class="flex flex-row justify-center">
          <form action={`/players/${props.actor.player.steamId}/accept-rules`} method="post">
            <button type="submit" class="button button--accent">
              I accept these rules
            </button>
          </form>
        </div>
      </div>
    </dialog>
  )
}
