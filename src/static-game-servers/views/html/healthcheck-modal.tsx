import type { HealthcheckResult, PhaseStatus } from '../../healthcheck-store'
import type { StaticGameServerModel } from '../../../database/models/static-game-server.model'

interface Props {
  result: HealthcheckResult
  checkId: string
  server: StaticGameServerModel
}

function PhaseIcon(props: { status: PhaseStatus['status'] }) {
  if (props.status === 'ok') {
    return (
      <span class="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-green-500 bg-green-500/15 text-[11px] text-green-400">
        ✓
      </span>
    )
  }
  if (props.status === 'fail') {
    return (
      <span class="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-red-500 bg-red-500/15 text-[11px] text-red-400">
        ✗
      </span>
    )
  }
  if (props.status === 'running') {
    return (
      <span class="flex h-[18px] w-[18px] animate-pulse items-center justify-center rounded-full border border-yellow-400 text-[11px] text-yellow-400">
        ●
      </span>
    )
  }
  // pending
  return (
    <span class="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/15 text-[11px] text-white/20">
      ○
    </span>
  )
}

function phaseMessage(phaseName: string, phase: PhaseStatus): string {
  if (phase.status === 'ok' || phase.status === 'fail') {
    return phase.message ?? ''
  }
  if (phase.status === 'running') {
    if (phaseName === 'RCON connect') return 'connecting…'
    if (phaseName === 'RCON command') return 'running…'
    return 'waiting for UDP…'
  }
  return ''
}

function PhaseRow(props: { name: string; phase: PhaseStatus }) {
  const msg = phaseMessage(props.name, props.phase)
  return (
    <div class="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-3 py-2 text-xs">
      <PhaseIcon status={props.phase.status} />
      <span class="flex-1 text-white/80" safe>
        {props.name}
      </span>
      {msg !== '' && (
        <span
          class={`max-w-[220px] overflow-hidden font-mono text-[11px] text-ellipsis whitespace-nowrap ${props.phase.status === 'fail' ? 'text-red-400' : 'text-white/30'}`}
          safe
        >
          {msg}
        </span>
      )}
    </div>
  )
}

function ResultBanner(props: { result: HealthcheckResult }) {
  if (props.result.status !== 'done') return <></>

  const allOk = Object.values(props.result.phases).every(p => p.status === 'ok')
  if (allOk) {
    return (
      <div class="mb-3 flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-400">
        ✓ All checks passed
      </div>
    )
  }
  return (
    <div class="mb-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
      ✗ Check failed
    </div>
  )
}

export function HealthcheckModal(props: Props) {
  const { result, checkId, server } = props
  const modalId = `healthcheck-modal-${result.serverId}`
  const isDone = result.status === 'done'

  const pollingAttrs = isDone
    ? {}
    : {
        'hx-get': `/admin/game-servers/healthcheck/${checkId}`,
        'hx-trigger': 'every 500ms',
        'hx-target': `#${modalId}`,
        'hx-swap': 'innerHTML',
      }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center" {...pollingAttrs}>
      <div class="absolute inset-0 bg-black/60" />
      <div class="relative z-10 w-[26rem] rounded-xl border border-white/10 bg-[#1c1b22] p-5 shadow-2xl">
        <div class="mb-1 text-sm font-bold">
          Healthcheck — <span safe>{server.name}</span>
        </div>
        <div class="mb-4 text-[11px] text-white/35">
          using internal address{' '}
          <code class="font-mono text-white/55" safe>
            {server.internalIpAddress}:{server.port}
          </code>
        </div>
        <ResultBanner result={result} />
        <div class="flex flex-col gap-1.5">
          <PhaseRow name="RCON connect" phase={result.phases.rconConnect} />
          <PhaseRow name="RCON command" phase={result.phases.rconCommand} />
          <PhaseRow name="Log round-trip" phase={result.phases.logRoundTrip} />
        </div>
        {isDone && (
          <button
            class="mt-3.5 w-full rounded-md border border-white/10 bg-white/[0.06] py-1.5 text-xs text-white/60"
            hx-on:click={`document.getElementById('${modalId}').replaceChildren()`}
          >
            Close
          </button>
        )}
      </div>
    </div>
  )
}
