import { requestContext } from '@fastify/request-context'

export function FlashMessages() {
  const messages = requestContext.get('messages')
  if (!messages) {
    return <></>
  }

  return (
    <div class="flash-messages" id="flash-messages">
      {Object.entries(messages).map(([type, message]) =>
        message?.map(message => <Message type={type} message={message} />),
      )}
    </div>
  )
}

FlashMessages.append = function (props: { message: string; type: string }) {
  return (
    <div id="flash-messages" hx-swap-oob="beforeend">
      <Message {...props} />
    </div>
  )
}

function Message(props: { message: string; type: string }) {
  return (
    <div class={['message', props.type]} data-flash-message>
      <div class="content" safe>
        {props.message}
      </div>
      <progress max="100" value="100"></progress>
    </div>
  )
}
