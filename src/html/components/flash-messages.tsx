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
          <div class={['message', type]}>
            <div class="content" safe>
              {message}
            </div>
            <progress
              max="100"
              value="100"
              _="init set box to the closest parent <div/> then js(me, box) initFlashMessage(me, box)"
            ></progress>
          </div>
        )),
      )}
    </div>
  )
}
