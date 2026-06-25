declare const serverIdBrand: unique symbol

export type ServerId = number & { readonly [serverIdBrand]: never }
