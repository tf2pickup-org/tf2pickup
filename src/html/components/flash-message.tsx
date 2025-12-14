import { requestContext } from '@fastify/request-context'

export interface FlashMessage {
  type: string
  message: string
}

export async function FlashMessageList() {
  const messages = requestContext.get('messages')
  const safeMessageList = messages
    ? Object.entries(messages).map(([type, message]) =>
        message?.map(message => <Message type={type} message={message} />),
      )
    : []
  return (
    <div class="flash-messages" id="flash-messages">
      {safeMessageList}
    </div>
  )
}

export async function FlashMessage(props: FlashMessage) {
  return (
    <div id="flash-messages" hx-swap-oob="beforeend">
      <Message {...props} />
    </div>
  )
}

function Message(props: FlashMessage) {
  return (
    <div class={['message', props.type]} data-flash-message>
      <div class="content" safe>
        {props.message}
      </div>
      <progress max="100" value="100"></progress>
    </div>
  )
}
