import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

// GhostWalker only plays 9v9 games, so in the 6v6 run they have no skill (default 1) and are
// never auto-verified.
const player = 'GhostWalker'

queues.afterEach(async ({ users }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.configurePlayerSkillThreshold(null)
  await admin.configureRequirePlayerVerification(false)
})

queues(
  'a skill threshold applies only to its own queue @multi-queue',
  async ({ queues, users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configurePlayerSkillThreshold(2, defaultQueueSlug())

    const queuePage = await users.byName(player).queuePage()
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeDisabled()

    const { slug } = await queues.create({ template: 'auto-6v6', enable: true })
    await new AdminQueuesPage(admin.page).moveToTop(slug)
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeEnabled()
  },
)

queues(
  'player verification applies only to its own queue @multi-queue',
  async ({ queues, users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configureRequirePlayerVerification(true, defaultQueueSlug())

    const queuePage = await users.byName(player).queuePage()
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeDisabled()

    const { slug } = await queues.create({ template: 'auto-6v6', enable: true })
    await new AdminQueuesPage(admin.page).moveToTop(slug)
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeEnabled()
  },
)
