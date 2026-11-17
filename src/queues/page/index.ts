import { render } from './render'
import { update } from './update'
import { updateAll } from './update-all'

export const queuePage = {
  render,
  update,
  updateAll,
} as const
