declare module 'postcss-lighten-darken' {
  import type { AcceptedPlugin, PluginCreator } from 'postcss'

  declare const plugin: PluginCreator<AcceptedPlugin | string>
  export = plugin
}
