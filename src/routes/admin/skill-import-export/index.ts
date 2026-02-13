import { PlayerRole } from '../../../database/models/player.model'
import { SkillImportExportPage } from '../../../admin/skill-import-export/views/html/skill-import-export.page'
import { PreviewPage } from '../../../admin/skill-import-export/views/html/preview.page'
import { exportSkills } from '../../../admin/skill-import-export/export-skills'
import { parseCsv } from '../../../admin/skill-import-export/parse-csv'
import {
  analyzeImport,
  type ImportAnalysis,
} from '../../../admin/skill-import-export/analyze-import'
import { applyImport } from '../../../admin/skill-import-export/apply-import'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

declare module '@fastify/secure-session' {
  interface SessionData {
    pendingImportAnalysis?: ImportAnalysis
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
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
      '/export',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        const csv = await exportSkills()
        const filename = `player-skills-${new Date().toISOString().split('T')[0]}.csv`
        void reply
          .status(200)
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .header('Cache-Control', 'no-cache')
          .send(csv)
      },
    )
    .post(
      '/upload',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        const data = await request.file()
        if (!data) {
          requestContext.set('messages', { error: ['No file uploaded'] })
          reply.status(400).html(await SkillImportExportPage())
          return
        }

        const content = await data.toBuffer()
        const csvContent = content.toString('utf-8')

        const parseResult = await parseCsv(csvContent)
        if (!parseResult.success) {
          requestContext.set('messages', { error: [parseResult.error] })
          reply.status(400).html(await SkillImportExportPage())
          return
        }

        const analysis = await analyzeImport(parseResult.players)

        // Store analysis in session for apply step
        request.session.set('pendingImportAnalysis', analysis)

        await reply.status(200).html(PreviewPage({ analysis }))
      },
    )
    .post(
      '/apply',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        const analysis = request.session.get('pendingImportAnalysis')
        if (!analysis) {
          requestContext.set('messages', {
            error: ['No pending import. Please upload a file first.'],
          })
          return reply.redirect('/admin/skill-import-export')
        }

        const user = requestContext.get('user')
        if (!user) {
          return reply.redirect('/admin/skill-import-export')
        }

        await applyImport({
          analysis,
          actor: user.player.steamId,
        })

        // Clear pending analysis
        request.session.set('pendingImportAnalysis', undefined)

        const totalChanges =
          analysis.changedPlayers.length +
          analysis.initializedPlayers.length +
          analysis.futurePlayers.length

        requestContext.set('messages', {
          success: [
            `Successfully applied ${totalChanges} skill change${totalChanges !== 1 ? 's' : ''}`,
          ],
        })
        reply.status(200).html(await SkillImportExportPage())
      },
    )
})
