import { configuration } from '../../../../configuration'
import { gamemodeConfigs } from '../../../../gamemodes/configs'
import { GameClassSkillInput } from '../../../../html/components/game-class-skill-input'
import { IconTable } from '../../../../html/components/icons'
import { Switch } from '../../../../html/components/switch'
import { queues } from '../../../../queues'
import { Admin } from '../../../views/html/admin'
import { SaveBar } from '../../../views/html/save-bar'
import { SettingCard } from '../../../views/html/setting-card'
import { SettingRow } from '../../../views/html/setting-row'

export async function SkillPage() {
  const [defaultPlayerSkill, skillStep, skillSuggestions, gamemodesInUse] = await Promise.all([
    configuration.get('games.default_player_skill'),
    configuration.get('games.skill_step'),
    configuration.get('games.skill_suggestions'),
    queues.gamemodesInUse(),
  ])
  const gamemodes = gamemodesInUse.filter(gamemode => gamemodeConfigs[gamemode].autoBalance)

  return (
    <Admin activePage="skill">
      <form action="/admin/skill" method="post" class="flex flex-col gap-4" data-save-bar>
        {gamemodes.length > 0 && (
          <SettingCard
            title="Default skill for new players"
            description="Used by the team balancer for players who have no skill assigned yet. Only gamemodes used by a queue are shown."
          >
            <div class="flex flex-col gap-2 py-4">
              {gamemodes.map(gamemode => (
                <div class="flex flex-row flex-wrap items-center gap-2">
                  <span class="w-16 font-bold">{gamemode}</span>
                  {gamemodeConfigs[gamemode].classes.map(({ name: gameClass }) => (
                    <GameClassSkillInput
                      gameClass={gameClass}
                      id={`defaultPlayerSkill-${gamemode}-${gameClass}`}
                      label={`Default ${gamemode} skill on ${gameClass}`}
                      name={`defaultPlayerSkill.${gamemode}.${gameClass}`}
                      value={defaultPlayerSkill[gamemode]?.[gameClass] ?? 1}
                      step={skillStep}
                    />
                  ))}
                </div>
              ))}
            </div>
          </SettingCard>
        )}

        <SettingCard title="Adjusting skill">
          <SettingRow
            label="Skill step"
            for="skillStep"
            configKey="games.skill_step"
            description="How much the +/− buttons change skill on a player's admin page."
          >
            <input
              type="number"
              id="skillStep"
              name="skillStep"
              value={skillStep.toString()}
              step="0.1"
              min="0.1"
            />
          </SettingRow>

          <SettingRow
            label="Skill suggestions (experimental)"
            for="skillSuggestions"
            configKey="games.skill_suggestions"
            description="Suggest skill changes in the admin toolbox, based on how players have been performing."
          >
            <div class="flex justify-end">
              <Switch id="skillSuggestions" name="skillSuggestions" checked={skillSuggestions} />
            </div>
          </SettingRow>
        </SettingCard>

        <SettingCard
          title="Import and export"
          description="Download every player's skill as a spreadsheet, or upload one to change many players at once."
        >
          <p class="py-4">
            <a href="/admin/skill-import-export" class="button" data-size="dense">
              <IconTable size={20} />
              <span>Import / export skills</span>
            </a>
          </p>
        </SettingCard>

        <SaveBar />
      </form>
    </Admin>
  )
}
