import Html from '@kitajs/html'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import type { WithId } from 'mongodb'
import { chat } from '../../../../chat'
import type { ChatMessageModel } from '../../../../database/models/chat-message.model'
import { IconLoader3, IconSend2, IconX } from '../../../../html/components/icons'
import { players } from '../../../../players'
import type { User } from '../../../../auth/types/user'
import { PlayerRole } from '../../../../database/models/player.model'
import { DeletedUser } from '../../../../html/components/deleted-user'
import { isDeletedUser, type SteamId64 } from '../../../../shared/types/steam-id-64'

export async function Chat(props: { user?: User | undefined }) {
  const isAdmin = props.user?.player.roles.includes(PlayerRole.admin) ?? false
  const isMuted = props.user
    ? players.hasActiveChatMute(await players.bySteamId(props.user.player.steamId, ['chatMutes']))
    : false
  return (
    <div class="chat" id="chat" data-is-admin={isAdmin ? '' : undefined}>
      {props.user ? (
        <>
          <ChatMessages />
          <ChatPrompt isMuted={isMuted} />
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
      <p class="text-zinc-400">
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

function chatDayId(date: Date) {
  return `chat-day-${format(date, 'yyyy-MM-dd')}`
}

function chatDayMessages(date: Date) {
  return `#${chatDayId(date)} .chat-day-messages`
}

function ChatDay(props: Html.PropsWithChildren<{ at: Date }>) {
  return (
    <div class="chat-day" id={chatDayId(props.at)}>
      <ChatDateSeparator at={props.at} />
      <div class="chat-day-messages">{props.children}</div>
    </div>
  )
}

function groupByDay(messages: WithId<ChatMessageModel>[]) {
  const days: WithId<ChatMessageModel>[][] = []
  for (const message of messages) {
    const day = days.at(-1)
    if (day && isSameDay(day[0]!.at, message.at)) {
      day.push(message)
    } else {
      days.push([message])
    }
  }
  return days
}

export function ChatMessageList(props: {
  messages: WithId<ChatMessageModel>[]
  before?: Date | undefined
}) {
  let trigger = <></>
  if (props.messages.length > 0) {
    trigger = (
      <div
        hx-get={`/chat?before=${props.messages[props.messages.length - 1]!.at.getTime()}`}
        hx-trigger="intersect once"
        hx-swap="outerHTML"
      >
        <IconLoader3 class="animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <>
      {groupByDay(props.messages).map(day => {
        const at = day[0]!.at
        const messages = day.map(message => <ChatMessage message={message} />)
        return props.before && isSameDay(at, props.before) ? (
          <div hx-swap-oob={`beforeend:${chatDayMessages(at)}`}>{messages}</div>
        ) : (
          <ChatDay at={at}>{messages}</ChatDay>
        )
      })}
      {trigger}
    </>
  )
}

ChatMessages.remove = function (messageId: string) {
  return <p id={`msg-${messageId}`} hx-swap-oob="delete"></p>
}

ChatMessages.append = function (props: {
  message: WithId<ChatMessageModel>
  previousMessageAt?: Date | undefined
}) {
  if (props.previousMessageAt && isSameDay(props.message.at, props.previousMessageAt)) {
    return (
      <div hx-swap-oob={`afterbegin:${chatDayMessages(props.message.at)}`}>
        <ChatMessage message={props.message} />
      </div>
    )
  }

  // htmx swaps into every element matching the id, so drop a stale group whose messages were all deleted
  return (
    <>
      <div id={chatDayId(props.message.at)} hx-swap-oob="delete"></div>
      <div id="chat-message-list" hx-swap-oob="afterbegin">
        <ChatDay at={props.message.at}>
          <ChatMessage message={props.message} />
        </ChatDay>
      </div>
    </>
  )
}

export function ChatPrompt(props: { isMuted: boolean }) {
  if (props.isMuted) {
    return (
      <div class="chat-prompt-container" id="chat-prompt-container">
        <div class="m-2 flex flex-row gap-2">
          <input type="text" class="flex-1" placeholder="you are currently muted" disabled />
        </div>
      </div>
    )
  }

  return (
    <div class="chat-prompt-container" id="chat-prompt-container">
      <div class="mention-completion" id="mention-completion" style="display: none;"></div>
      <form
        class="m-2 flex flex-row gap-2"
        id="chat-prompt"
        hx-post="/chat"
        hx-swap="none"
        hx-disabled-elt="find input[type='text'], find button"
        data-reset-on-success="input[type='text']"
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
        <button class="text-zinc-200" type="submit">
          <IconSend2 />
          <span class="sr-only">Send message</span>
        </button>
      </form>
    </div>
  )
}

async function ChatMessage(props: { message: WithId<ChatMessageModel> }) {
  const safeAt = format(props.message.at, 'HH:mm')
  const safeBody = props.message.body
  const messageId = props.message._id.toString()
  return (
    <p class="chat-message" id={`msg-${messageId}`}>
      <span class="message-text">
        <span class="at">{safeAt}</span> <ChatMessageAuthor steamId={props.message.author} />:{' '}
        <span class="body">{safeBody}</span>
      </span>
      <button
        class="delete-btn"
        hx-delete={`/chat/${messageId}`}
        hx-target="closest p"
        hx-swap="delete"
        hx-confirm="Delete this message?"
        title="Delete message"
      >
        <IconX />
        <span class="sr-only">Delete message</span>
      </button>
    </p>
  )
}

async function ChatMessageAuthor(props: { steamId: SteamId64 }) {
  if (isDeletedUser(props.steamId)) {
    return <DeletedUser class="author" />
  }
  const author = await players.bySteamId(props.steamId, ['name', 'roles', 'steamId'])
  const isAdmin = author.roles.includes(PlayerRole.admin)
  return (
    <a
      href={`/players/${author.steamId}`}
      class={`author ${isAdmin ? 'admin' : ''}`}
      preload="mousedown"
      safe
    >
      {author.name}
    </a>
  )
}
