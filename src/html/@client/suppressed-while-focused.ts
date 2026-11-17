// "Your pick" alerts are flagged to fire only while the tab is unfocused; every other alert
// (ready-up, chat…) fires regardless.
export function suppressedWhileFocused(flagged: boolean, hasFocus: boolean) {
  return flagged && hasFocus
}
