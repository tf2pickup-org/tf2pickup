import { GameClassIcon } from '../../../html/components/game-class-icon'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'

export async function WinLossChart() {
  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-row gap-4 text-ash">
        All
        <GameClassIcon gameClass={Tf2ClassName.scout} size={24} />
        <GameClassIcon gameClass={Tf2ClassName.soldier} size={24} />
        <GameClassIcon gameClass={Tf2ClassName.demoman} size={24} />
        <GameClassIcon gameClass={Tf2ClassName.medic} size={24} />
        <span class="text-green-500">W: 5</span>
        <span class="text-red-500">L: 5</span>
      </div>
      <div class="flex flex-row justify-around gap-1">
        <div class="h-[20px] w-[16px] bg-red-500"></div>
        <div class="h-[20px] w-[16px] bg-green-500"></div>
        <div class="h-[20px] w-[16px] bg-green-500"></div>
        <div class="h-[20px] w-[16px] bg-red-500"></div>
        <div class="h-[20px] w-[16px] bg-red-500"></div>
        <div class="h-[20px] w-[16px] bg-red-500"></div>
        <div class="h-[20px] w-[16px] bg-green-500"></div>
        <div class="h-[20px] w-[16px] bg-green-500"></div>
        <div class="h-[20px] w-[16px] bg-green-500"></div>
        <div class="h-[20px] w-[16px] bg-red-500"></div>
      </div>
    </div>
  )
}
