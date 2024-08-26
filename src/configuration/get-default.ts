import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'

export function getDefault<T extends keyof Configuration>(key: T): Configuration[T] {
  return configurationSchema.options
    .find(o => o._def.shape().key._def.value === key)!
    ._def.shape()
    .value._def.defaultValue() as Configuration[T]
}
