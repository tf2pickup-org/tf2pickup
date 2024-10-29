import { requestContext } from '@fastify/request-context'

export function FlashMessages() {
  const messages = requestContext.get('messages')
  if (!messages) {
    return <></>
  }

  return (
    <div class="flash-messages">
      {Object.entries(messages).map(([type, message]) =>
        message?.map(message => (
          <div class={['message', type]} data-flash-message>
            <div class="content" safe>
              {message}
            </div>
            <progress max="100" value="100"></progress>
          </div>
        )),
      )}
    </div>
  )
}
