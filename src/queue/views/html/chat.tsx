import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import { chat } from '../../../chat'
import type { ChatMessageModel } from '../../../database/models/chat-message.model'
import { IconLoader3, IconSend2 } from '../../../html/components/icons'
import { players } from '../../../players'
import type { User } from '../../../auth/types/user'
import { PlayerRole } from '../../../database/models/player.model'

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

function formatChatDateLabel(date: Date): string {
  if (isToday(date)) {
    return 'Today'
  }

  if (isYesterday(date)) {
    return 'Yesterday'
  }

  return format(date, 'yyyy-MM-dd')
}

function ChatDateSeparator(props: { at: Date }) {
  const label = formatChatDateLabel(props.at)

  return (
    <div class="chat-date-separator">
      <span safe>{label}</span>
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

  const nodes: JSX.Element[] = []
  let previousAt: Date | undefined

  for (const message of props.messages) {
    if (previousAt && !isSameDay(message.at, previousAt)) {
      // We are crossing from a newer day (previousAt) to an older day (message.at).
      // Place the separator for the newer day *after* its last message in DOM.
      nodes.push(<ChatDateSeparator at={previousAt} />)
    }

    nodes.push(<ChatMessage message={message} />)
    previousAt = message.at
  }

  if (previousAt) {
    // Add a separator for the oldest day at the end so it appears above that
    // day's messages once column-reverse is applied.
    nodes.push(<ChatDateSeparator at={previousAt} />)
  }

  return (
    <>
      {nodes}
      {trigger}
    </>
  )
}

ChatMessages.append = function (props: {
  message: ChatMessageModel
  previousMessageAt?: Date | undefined
}) {
  return (
    <div id="chat-message-list" hx-swap-oob="afterbegin">
      <ChatMessage message={props.message} />
      {/* When the new message starts a new day compared to the previous message, insert a
          separator for the newer (current) day after it so it appears visually above
          this day's messages in the column-reverse list. */}
      {(!props.previousMessageAt || !isSameDay(props.message.at, props.previousMessageAt)) && (
        <ChatDateSeparator at={props.message.at} />
      )}
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
  const safeBody = props.message.body
  const isAdmin = author.roles.includes(PlayerRole.admin)
  return (
    <p>
      <span class="at">{safeAt}</span>{' '}
      <a
        href={`/players/${author.steamId}`}
        class={`author ${isAdmin ? 'admin' : ''}`}
        preload="mousedown"
        safe
      >
        {author.name}
      </a>
      : <span class="body">{safeBody}</span>
    </p>
  )
}
