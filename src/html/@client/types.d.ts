declare module 'idiomorph' {
  export const Idiomorph: {
    morph: (oldNode: Node, newContent: NodeListOf<ChildNode>, config: object) => Node[]
  }
}
interface Window {
  htmx: typeof import('htmx.org').default
}
