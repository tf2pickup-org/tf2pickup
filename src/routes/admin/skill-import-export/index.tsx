import { PlayerRole, type PlayerSkill } from '../../../database/models/player.model'
import { SkillImportExportPage } from '../../../admin/skill-import-export/views/html/skill-import-export.page'
import { ImportConflictDialog } from '../../../admin/skill-import-export/views/html/import-conflict-dialog'
import { exportSkills } from '../../../admin/skill-import-export/export-skills'
import { parseSkillImport } from '../../../admin/skill-import-export/parse-skill-import'
import {
  applyImportedSkills,
  applySkillOverride,
} from '../../../admin/skill-import-export/apply-imported-skills'
import { z } from 'zod'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import type { SkillConflict } from '../../../admin/skill-import-export/types'
import { Admin } from '../../../admin/views/html/admin'
import { players } from '../../../players'
import multipart from '@fastify/multipart'
import { environment } from '../../../environment'

const conflictSchema = z.object({
  steamId: steamId64,
  playerName: z.string(),
  currentSkill: z.record(z.string(), z.number()),
  importedSkill: z.record(z.string(), z.number()),
})

const conflictsArraySchema = z.array(conflictSchema)

const skillSchema = z.record(z.string(), z.number())

export default routes(async app => {
  // Register multipart support for this route
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  })

  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        reply.status(200).html(await SkillImportExportPage())
      },
    )
    .get(
      '/export.csv',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        const csv = await exportSkills()
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const filename = `${environment.WEBSITE_NAME}-skills-${timestamp}.csv`
        await reply
          .header('Content-Type', 'text/csv')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(csv)
      },
    )
    .post(
      '/import',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        const user = requestContext.get('user')!
        const data = await request.file()

        if (!data) {
          requestContext.set('messages', { error: ['No file uploaded'] })
          reply.status(400).html(await SkillImportExportPage())
          return
        }

        const buffer = await data.toBuffer()
        const csvContent = buffer.toString('utf-8')

        try {
          const rows = await parseSkillImport(csvContent)

          if (rows.length === 0) {
            requestContext.set('messages', { error: ['No valid skill data found in the CSV'] })
            reply.status(400).html(await SkillImportExportPage())
            return
          }

          const result = await applyImportedSkills({
            rows,
            actor: user.player.steamId,
          })

          if (result.conflicts.length > 0) {
            // Show conflict resolution dialog
            const [currentConflict, ...remainingConflicts] = result.conflicts
            await reply.status(200).html(
              <Admin activePage="skill-import-export">
                <div class="flex flex-col gap-4">
                  {result.applied > 0 && (
                    <p class="text-green-500">
                      Applied skills to <strong>{result.applied}</strong> player(s).
                    </p>
                  )}
                  {result.pending > 0 && (
                    <p class="text-accent-500">
                      Stored <strong>{result.pending}</strong> pending skill(s) for unregistered
                      players.
                    </p>
                  )}
                  <ImportConflictDialog
                    conflict={currentConflict!}
                    remainingCount={remainingConflicts.length}
                    conflicts={remainingConflicts}
                  />
                </div>
              </Admin>,
            )
            return
          }

          // All done with no conflicts
          const messages: string[] = []
          if (result.applied > 0) {
            messages.push(`Applied skills to ${result.applied} player(s)`)
          }
          if (result.pending > 0) {
            messages.push(`Stored ${result.pending} pending skill(s) for unregistered players`)
          }
          requestContext.set('messages', { success: messages })
          reply.status(200).html(await SkillImportExportPage())
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          requestContext.set('messages', { error: [message] })
          reply.status(400).html(await SkillImportExportPage())
        }
      },
    )
    .post(
      '/resolve',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            action: z.enum(['ignore', 'ignore-all', 'override', 'override-all']),
            steamId: steamId64.optional(),
            skill: z.string().optional(),
            conflicts: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const user = requestContext.get('user')!
        const { action, steamId, skill, conflicts: conflictsJson } = request.body

        let remainingConflicts: SkillConflict[]
        try {
          remainingConflicts = conflictsArraySchema.parse(
            JSON.parse(decodeURIComponent(conflictsJson)),
          ) as SkillConflict[]
        } catch {
          requestContext.set('messages', { error: ['Invalid conflict data'] })
          reply.status(400).html(await SkillImportExportPage())
          return
        }

        switch (action) {
          case 'ignore':
            // Just move to next conflict
            break

          case 'ignore-all':
            // Skip all remaining conflicts
            requestContext.set('messages', {
              success: ['Import completed. All remaining conflicts were ignored.'],
            })
            reply.status(200).html(await SkillImportExportPage())
            return

          case 'override':
            if (steamId && skill) {
              const parsedSkill = skillSchema.parse(JSON.parse(skill)) as PlayerSkill
              await applySkillOverride({
                steamId,
                skill: parsedSkill,
                actor: user.player.steamId,
              })
            }
            break

          case 'override-all':
            // Apply all remaining skills
            for (const conflict of remainingConflicts) {
              await players.setSkill({
                steamId: conflict.steamId,
                skill: conflict.importedSkill,
                actor: user.player.steamId,
              })
            }
            // Also apply current one if provided
            if (steamId && skill) {
              const parsedSkill = skillSchema.parse(JSON.parse(skill)) as PlayerSkill
              await applySkillOverride({
                steamId,
                skill: parsedSkill,
                actor: user.player.steamId,
              })
            }
            requestContext.set('messages', {
              success: ['Import completed. All skills have been applied.'],
            })
            reply.status(200).html(await SkillImportExportPage())
            return
        }

        // Check if there are more conflicts
        if (remainingConflicts.length > 0) {
          const [nextConflict, ...rest] = remainingConflicts
          await reply.status(200).html(
            <Admin activePage="skill-import-export">
              <ImportConflictDialog
                conflict={nextConflict!}
                remainingCount={rest.length}
                conflicts={rest}
              />
            </Admin>,
          )
          return
        }

        // All conflicts resolved
        requestContext.set('messages', { success: ['Import completed successfully'] })
        reply.status(200).html(await SkillImportExportPage())
      },
    )
})
