# Unit tests mock the database collections

Unit tests mock `collections` (via `vi.mock`) instead of running against an in-memory or containerized MongoDB. A real MongoDB is exercised only by the e2e suite, which already covers the behaviour end to end. Modules whose logic is hard to test through mocks should grow an internal pure seam (e.g. the queue engine's transition rules) rather than pull a database into unit tests.

## Considered options

- **`mongodb-memory-server`** or **the docker `mongo` in vitest**: rejected; the unit/e2e split is deliberate.
