import { Tf2ClassName } from '../../shared/types/tf2-class-name'

export interface GameClass {
  name: Tf2ClassName
  count: number
  canMakeFriendsWith?: Tf2ClassName[]
}
