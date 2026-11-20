import { parse } from 'marked'
import type { User } from '../../../auth/types/user'
import { collections } from '../../../database/collections'
import { logger } from '../../../logger'
import { nanoid } from 'nanoid'

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
  const id = nanoid()

  return (
    <>
      <dialog title="Accept rules dialog" class="accept-rules-dialog" id={id}>
        <div class="flex flex-col gap-6">
          {/* Kita's div type omits the global autofocus attribute. */}
          <div
            class="rules-wrapper fade-scroll"
            data-fade-scroll
            role="region"
            aria-label="Rules"
            tabindex="-1"
            {...{ autofocus: true }}
          >
            <article class="prose prose-invert mb-16 max-w-none">{safeRules}</article>
          </div>

          <div class="flex flex-row justify-center">
            <form
              action={`/players/${props.actor.player.steamId}/accept-rules`}
              method="post"
              hx-post={`/players/${props.actor.player.steamId}/accept-rules`}
              hx-target="closest dialog"
              hx-swap="delete"
            >
              <button
                type="submit"
                class="button"
                data-variant="accent"
                data-umami-event="accept-rules"
              >
                I accept these rules
              </button>
            </form>
          </div>
        </div>
      </dialog>
      <script type="module">{`
        const dialog = document.getElementById('${id}');
        dialog.showModal();
        // Focusing the rules can scroll past the dialog's top padding.
        dialog.scrollTop = 0;
    `}</script>
    </>
  )
}
