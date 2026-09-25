import { expect, queues } from '../fixtures/queues'
import { defaultQueueSlug } from '../queue-slots'

queues(
  "editing one queue's map pool leaves the others alone @multi-queue",
  async ({ queues, users }) => {
    const admin = await users.getAdmin().adminPage()
    const before = await admin.mapPool(defaultQueueSlug())

    const { slug } = await queues.create({ template: 'auto-6v6' })
    const pool = [
      { name: 'cp_isolated_a', execConfig: 'etf2l_6v6_5cp' },
      { name: 'cp_isolated_b', execConfig: 'etf2l_6v6_5cp' },
      { name: 'cp_isolated_c', execConfig: 'etf2l_6v6_5cp' },
    ]
    await admin.setMapPool(pool, slug)

    expect(await admin.mapPool(slug)).toEqual(pool)
    expect(await admin.mapPool(defaultQueueSlug())).toEqual(before)
  },
)
