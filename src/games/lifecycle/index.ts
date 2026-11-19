import { configure } from './configure'
import { end } from './end'
import { interrupt } from './interrupt'
import { launch } from './launch'
import { replace } from './replace'
import { requestSubstitute } from './request-substitute'
import { restart } from './restart'
import { setConnection } from './set-connection'
import { start } from './start'

export const gameLifecycle = {
  configure,
  end,
  interrupt,
  launch,
  replace,
  requestSubstitute,
  restart,
  setConnection,
  start,
}
