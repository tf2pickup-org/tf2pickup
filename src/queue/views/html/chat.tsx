import { IconSend2 } from '../../../html/components/icons'

export function Chat() {
  return (
    <div class="tabcontent chat" id="chat">
      <div class="flex-1 p-2">
        <p>
          <strong>Drozdzers:</strong> twoja stara
        </p>
        <p>
          <strong>wonszu:</strong> zapierdala
        </p>
      </div>

      <div class="flex flex-row gap-2">
        <textarea class="flex-1" rows="1" placeholder="Send message..."></textarea>
        <button class="text-ash">
          <IconSend2 />
        </button>
      </div>
    </div>
  )
}
