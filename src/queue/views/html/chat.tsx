import { format } from 'date-fns'
import { chat } from '../../../chat'
import type { ChatMessageModel } from '../../../database/models/chat-message.model'
import { IconSend2 } from '../../../html/components/icons'
import { players } from '../../../players'
import type { User } from '../../../auth/types/user'

export async function Chat(props: { user?: User | undefined }) {
  return (
    <div class="chat" id="chat">
      <ChatMessageList />
      {!!props.user && <ChatPrompt />}
    </div>
  )
}

export async function ChatMessageList() {
  const snapshot = await chat.getSnapshot()
  return (
    <div class="message-list" id="chat-message-list">
      {snapshot.map(message => (
        <ChatMessage message={message} />
      ))}
      <div id="chat-anchor"></div>
    </div>
  )
}

ChatMessageList.append = function (props: { message: ChatMessageModel }) {
  return (
    <div id="chat-anchor" hx-swap-oob="beforebegin">
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
        autofocus=""
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
      <span class="whitespace-nowrap text-[12px] text-abru-light-50">{safeAt}</span>{' '}
      <a href={`/players/${author.steamId}`} preload="mousedown" safe>
        {author.name}
      </a>
      : <span safe>{props.message.body}</span>
    </p>
  )
}
