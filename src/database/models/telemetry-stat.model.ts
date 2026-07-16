export interface TelemetryStatModel {
  /** UTC day, formatted as YYYY-MM-DD */
  day: string
  /** admin skill saves that followed at least one live skill suggestion */
  skillSuggestionsApplied?: number
  /** all admin skill saves made via the admin toolbox */
  adminSkillChanges?: number
  /** renders of the admin edit-player ELO page */
  eloPageRenders?: number
}
