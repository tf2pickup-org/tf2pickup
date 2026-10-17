import { expect, queues } from '../fixtures/queues'
import { getQueueConfig } from '../queue-slots'

// GhostWalker only plays 9v9 games, so in the 6v6 run they have no skill of their own.
const player = 'GhostWalker'

queues.afterEach(async ({ users }) => {
  const admin = await users.getAdmin().adminPage()
  await admin.configurePlayerSkillThreshold(null)
  await admin.configureDefaultSkill(getQueueConfig(), 'scout', 1)
})

queues(
  "a player without skill is judged by their gamemode's default skill @multi-queue",
  async ({ users }) => {
    const admin = await users.getAdmin().adminPage()
    await admin.configurePlayerSkillThreshold(2)

    const queuePage = await users.byName(player).queuePage()
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeDisabled()

    await admin.configureDefaultSkill(getQueueConfig(), 'scout', 3)
    await queuePage.goto()
    await expect(queuePage.slot('scout-1').joinButton()).toBeEnabled()
    await expect(queuePage.slot('soldier-1').joinButton()).toBeDisabled()
  },
)
