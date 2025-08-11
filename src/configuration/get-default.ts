import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'

export function getDefault<T extends keyof Configuration>(key: T): Configuration[T] {
  return configurationSchema.options.find(o => o._zod.def.shape.key._zod.def.values[0] === key)!
    ._zod.def.shape.value._zod.def.defaultValue as Configuration[T]
}
