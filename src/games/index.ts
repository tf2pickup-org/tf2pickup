import { update } from './update'
import { getSubstitutionRequests } from './get-substitution-requests'
import { findOne } from './find-one'

export const games = {
  findOne,
  getSubstitutionRequests,
  update,
} as const
