declare const _whitelistOptionId: unique symbol
export type WhitelistId = number & { [_whitelistOptionId]: never }

export interface WhitelistOption {
  id: WhitelistId
  file: string
}
