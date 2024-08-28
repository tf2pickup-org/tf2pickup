export class InsufficientInGameHoursError extends Error {
  constructor(
    public readonly steamId: string,
    public readonly requiredHours: number,
    public readonly reportedHours: number,
  ) {
    super(
      `insufficient TF2 in-game hours (steamId: ${steamId}, reported: ${reportedHours}, required: ${requiredHours})`,
    )
  }
}
