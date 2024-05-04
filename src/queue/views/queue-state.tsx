export async function QueueState(props: { current: number; required: number }) {
  return (
    <div class="bg-abru-light-70 relative flex h-[55px] flex-row items-center justify-center rounded-lg p-2 shadow-md sm:py-2">
      <div class="mx-4 flex-1 text-xl font-bold lg:text-center flex-row flex gap-2 justify-center items-center">
        <span>Players:</span>
        <span>
          {props.current}/{props.required}
        </span>
      </div>
    </div>
  )
}
