import { expect, queues } from '../fixtures/queues'
import { AdminQueuesPage } from '../pages/admin-queues.page'
import { defaultQueueSlug } from '../queue-slots'

interface QueueList {
  _embedded: { queues: { slug: string; gamemode: string; slots: unknown[] }[] }
}

queues('the API lists enabled queues in order @multi-queue', async ({ queues, users, request }) => {
  const ultiduo = await queues.create({ template: 'auto-ultiduo', enable: true })
  const bball = await queues.create({ template: 'auto-bball' })

  const slugs = async () =>
    ((await (await request.get('/api/v1/queues')).json()) as QueueList)._embedded.queues.map(
      q => q.slug,
    )
  expect(await slugs()).toEqual([defaultQueueSlug(), ultiduo.slug])

  await new AdminQueuesPage(await users.getAdmin().page()).moveToTop(ultiduo.slug)
  expect(await slugs()).toEqual([ultiduo.slug, defaultQueueSlug()])

  const res = await request.get('/api/v1/queue')
  expect(((await res.json()) as { slug: string }).slug).toBe(ultiduo.slug)

  const one = (await (await request.get(`/api/v1/queues/${ultiduo.slug}`)).json()) as {
    gamemode: string
    slots: unknown[]
  }
  expect(one.gamemode).toBe('ultiduo')
  expect(one.slots).toHaveLength(4)

  expect((await request.get(`/api/v1/queues/${bball.slug}`)).status()).toBe(404)
})
