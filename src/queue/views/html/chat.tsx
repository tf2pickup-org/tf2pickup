import { format } from 'date-fns'
import { chat } from '../../../chat'
import type { ChatMessageModel } from '../../../database/models/chat-message.model'
import { IconLoader3, IconSend2 } from '../../../html/components/icons'
import { players } from '../../../players'
import type { User } from '../../../auth/types/user'

export async function Chat(props: { user?: User | undefined }) {
  return (
    <div class="chat" id="chat">
      {props.user ? (
        <>
          <ChatMessages />
          <ChatPrompt />
        </>
      ) : (
        <ChatLogInPrompt />
      )}
    </div>
  )
}

async function ChatLogInPrompt() {
  return (
    <div class="flex flex-1 flex-col items-center">
      <p class="text-abru-light-50">
        You need to{' '}
        <a href="/auth/steam" hx-boost="false" data-umami-event="login-steam">
          sign in
        </a>{' '}
        to see the chat.
      </p>
    </div>
  )
}

export async function ChatMessages() {
  return (
    <div class="message-list" id="chat-message-list">
      <ChatMessageList messages={await chat.getSnapshot()} />
    </div>
  )
}

export function ChatMessageList(props: { messages: ChatMessageModel[] }) {
  let trigger = <></>
  if (props.messages.length > 0) {
    trigger = (
      <div
        hx-get={`/chat?before=${props.messages[props.messages.length - 1]!.at.getTime()}`}
        hx-trigger="intersect once"
        hx-swap="outerHTML"
      >
        <IconLoader3 class="animate-spin text-abru-light-50" />
      </div>
    )
  }

  return (
    <>
      {props.messages.map(message => (
        <ChatMessage message={message} />
      ))}
      {trigger}
    </>
  )
}

ChatMessages.append = function (props: { message: ChatMessageModel }) {
  return (
    <div id="chat-message-list" hx-swap-oob="afterbegin">
      <ChatMessage message={props.message} />
    </div>
  )
}

export function ChatPrompt() {
  return (
    <form
      class="m-2 flex flex-row gap-2"
      hx-post="/chat"
      hx-target="this"
      hx-swap="outerHTML"
      id="chat-prompt"
      data-disable-when-offline
    >
      <input
        type="text"
        class="flex-1"
        placeholder="Send message..."
        name="message"
        autocomplete="off"
        autofocus
        required
      />
      <button class="text-abru-light-75" type="submit">
        <IconSend2 />
        <span class="sr-only">Send message</span>
      </button>
    </form>
  )
}

async function ChatMessage(props: { message: ChatMessageModel }) {
  const author = await players.bySteamId(props.message.author)
  const safeAt = format(props.message.at, 'HH:mm')
  return (
    <p>
      <span class="at">{safeAt}</span>{' '}
      <a href={`/players/${author.steamId}`} preload="mousedown" safe>
        {author.name}
      </a>
      : <span safe>{props.message.body}</span>
    </p>
  )
}
