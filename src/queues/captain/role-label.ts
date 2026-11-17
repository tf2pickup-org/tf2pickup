/** Plain-text labels include the class when it differs from the role name. */
export function roleLabel(role: { name: string; gameClass: string }): string {
  return role.name !== role.gameClass ? `${role.name} ${role.gameClass}` : role.name
}
