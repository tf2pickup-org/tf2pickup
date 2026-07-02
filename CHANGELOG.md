# Changelog

# [4.18.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.17.2...4.18.0) (2026-07-02)


### Bug Fixes

* **deps:** update dependency @fastify/rate-limit to v11.1.0 ([110f8e5](https://github.com/tf2pickup-org/tf2pickup/commit/110f8e56c0373404ae08d5eb256c263aa25abc55))
* **deps:** update dependency postcss to v8.5.16 ([0ed0090](https://github.com/tf2pickup-org/tf2pickup/commit/0ed0090b385ef4500f6b88e3821307c5492cf128))


### Features

* **atlas:** report 30-day active players ([#720](https://github.com/tf2pickup-org/tf2pickup/issues/720)) ([2879cc7](https://github.com/tf2pickup-org/tf2pickup/commit/2879cc74e8dfea2fa6d065c81c4983bc2af62dee)), closes [tf2pickup-org/atlas#3](https://github.com/tf2pickup-org/atlas/issues/3)

## [4.17.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.17.1...4.17.2) (2026-06-30)


### Bug Fixes

* **games:** prevent htmx from swallowing the join voice link ([#719](https://github.com/tf2pickup-org/tf2pickup/issues/719)) ([b418de7](https://github.com/tf2pickup-org/tf2pickup/commit/b418de71cf05c0e4dfd1482ca9e46f0b03caa8de))

## [4.17.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.17.0...4.17.1) (2026-06-30)


### Bug Fixes

* **deps:** update dependency mongodb to v7.4.0 ([fc0e408](https://github.com/tf2pickup-org/tf2pickup/commit/fc0e408839ae4d39656f01dcf83d83c59ee20d73))


### Performance Improvements

* **players:** speed up player page LCP and dedupe profile query ([#717](https://github.com/tf2pickup-org/tf2pickup/issues/717)) ([547de4c](https://github.com/tf2pickup-org/tf2pickup/commit/547de4c0a5df445967f2907212bd8089d9315bf6))

# [4.17.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.16.1...4.17.0) (2026-06-29)


### Features

* **logging:** record real client IP and User-Agent on request logs ([#713](https://github.com/tf2pickup-org/tf2pickup/issues/713)) ([03a8369](https://github.com/tf2pickup-org/tf2pickup/commit/03a8369236ce3110595f9b570bc7a3ae48f08729))
* **queue:** mark admins in the online player list ([#714](https://github.com/tf2pickup-org/tf2pickup/issues/714)) ([9c154ac](https://github.com/tf2pickup-org/tf2pickup/commit/9c154ac35ad425f8257722ad4f214a8e15ea2b5b))
* report anonymous instance telemetry ([#702](https://github.com/tf2pickup-org/tf2pickup/issues/702)) ([0e79485](https://github.com/tf2pickup-org/tf2pickup/commit/0e79485341620ef7d4144c538a9453d0cc4571de))


### Performance Improvements

* **queue:** debounce online player list broadcasts ([#715](https://github.com/tf2pickup-org/tf2pickup/issues/715)) ([3d910e8](https://github.com/tf2pickup-org/tf2pickup/commit/3d910e8e0160482cbf92c578f539b256d2322b91))

## [4.16.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.16.0...4.16.1) (2026-06-29)


### Bug Fixes

* **branding:** standardize favicon resolutions across instances ([#710](https://github.com/tf2pickup-org/tf2pickup/issues/710)) ([a22eeef](https://github.com/tf2pickup-org/tf2pickup/commit/a22eeef3dd78bc02ded8f691cd1c82d9e0111f5f))
* **deps:** update dependency country-flag-icons to v1.6.19 ([11ea678](https://github.com/tf2pickup-org/tf2pickup/commit/11ea67888589753b89b513c019ffefe0bc4fc3de))
* **deps:** update dependency es-toolkit to v1.49.0 ([708f096](https://github.com/tf2pickup-org/tf2pickup/commit/708f096bcc74747f33f03a9a8e4387d3d1a524a3))
* **deps:** update dependency fastify-type-provider-zod to v7 ([#709](https://github.com/tf2pickup-org/tf2pickup/issues/709)) ([c82ddcd](https://github.com/tf2pickup-org/tf2pickup/commit/c82ddcd5b3837c0dcb8a7b355bb41b471dc75678))
* **deps:** update dependency motion to v12.41.0 ([fe46943](https://github.com/tf2pickup-org/tf2pickup/commit/fe469433afe5aa95a3c80dc65dcaa4532c0474d6))
* **deps:** update dependency motion to v12.42.0 ([3e2754c](https://github.com/tf2pickup-org/tf2pickup/commit/3e2754c46113a50d547ff922194a147baa52ea7b))
* **deps:** update dependency nanoid to v5.1.16 ([00905f6](https://github.com/tf2pickup-org/tf2pickup/commit/00905f614d7dd2bcf5a3c8189733884864c94521))
* **logging:** right-size noisy warn/error logs and guard match end/restart ([#712](https://github.com/tf2pickup-org/tf2pickup/issues/712)) ([fe7676a](https://github.com/tf2pickup-org/tf2pickup/commit/fe7676ae9d66f4a3d69c28863bab6c547444ff09))

# [4.16.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.15.0...4.16.0) (2026-06-26)


### Features

* link-preview meta tags and generated OG images ([#707](https://github.com/tf2pickup-org/tf2pickup/issues/707)) ([a502c24](https://github.com/tf2pickup-org/tf2pickup/commit/a502c2432ce717f6b75cb608ccb3aaffe3d23827))

# [4.15.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.14.1...4.15.0) (2026-06-26)


### Bug Fixes

* **analytics:** expand umami tracking coverage ([#706](https://github.com/tf2pickup-org/tf2pickup/issues/706)) ([8ecb710](https://github.com/tf2pickup-org/tf2pickup/commit/8ecb710423ec7fa8f5d0d9b3a2c840158bda8230))
* **deps:** update dependency country-flag-icons to v1.6.18 ([4902750](https://github.com/tf2pickup-org/tf2pickup/commit/4902750795a75aed63480136a58e3ec3d405974a))
* **deps:** update dependency es-toolkit to v1.48.1 ([96cc070](https://github.com/tf2pickup-org/tf2pickup/commit/96cc07035e41d8e2380ad3a065d81acdaec0e261))
* **deps:** update dependency nanoid to v5.1.15 ([ed45ac4](https://github.com/tf2pickup-org/tf2pickup/commit/ed45ac4a87922ad9cce35d6fd416ca62233db37f))
* keep game connect info visible to admins when hidden from spectators ([#699](https://github.com/tf2pickup-org/tf2pickup/issues/699)) ([957b08b](https://github.com/tf2pickup-org/tf2pickup/commit/957b08b46b9b95624f9b221d2e491af5f79837e4)), closes [#697](https://github.com/tf2pickup-org/tf2pickup/issues/697) [#698](https://github.com/tf2pickup-org/tf2pickup/issues/698)
* **players:** make steam id confirmation input visible ([#701](https://github.com/tf2pickup-org/tf2pickup/issues/701)) ([aea3483](https://github.com/tf2pickup-org/tf2pickup/commit/aea34839da900e23a2efb1f6e10f1e83b4c9d9f9))
* **queue:** match stream list to Figma design ([#705](https://github.com/tf2pickup-org/tf2pickup/issues/705)) ([bc1e822](https://github.com/tf2pickup-org/tf2pickup/commit/bc1e8225b30c75cc89ff81a01053052479797689))
* tolerate null tags in Twitch streams response ([#700](https://github.com/tf2pickup-org/tf2pickup/issues/700)) ([d7f240c](https://github.com/tf2pickup-org/tf2pickup/commit/d7f240cc3117a948fdc6569f2947607900e30098))


### Features

* **players:** allow super-users to delete player profiles ([#684](https://github.com/tf2pickup-org/tf2pickup/issues/684)) ([4764c32](https://github.com/tf2pickup-org/tf2pickup/commit/4764c325abe35338a954d8d78c859e0adf3023ed))
* **players:** periodically re-sync player avatars from Steam ([#680](https://github.com/tf2pickup-org/tf2pickup/issues/680)) ([07481c8](https://github.com/tf2pickup-org/tf2pickup/commit/07481c819a214aa0c1a933a96410912c73f51695)), closes [#679](https://github.com/tf2pickup-org/tf2pickup/issues/679) [#679](https://github.com/tf2pickup-org/tf2pickup/issues/679) [#679](https://github.com/tf2pickup-org/tf2pickup/issues/679)

## [4.14.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.14.0...4.14.1) (2026-06-23)


### Bug Fixes

* hide game server info from spectators to mitigate DDoS ([#697](https://github.com/tf2pickup-org/tf2pickup/issues/697)) ([c9688ff](https://github.com/tf2pickup-org/tf2pickup/commit/c9688ff27655d8fc7706e5e0743058ce7f624375))
* key rate limiter on real client IP ([#696](https://github.com/tf2pickup-org/tf2pickup/issues/696)) ([b929f97](https://github.com/tf2pickup-org/tf2pickup/commit/b929f9780e1191b298c61a709b9ff5787a2118f2))

# [4.14.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.13.0...4.14.0) (2026-06-23)


### Bug Fixes

* group Cyrillic player names under their own alphabet ([#692](https://github.com/tf2pickup-org/tf2pickup/issues/692)) ([39403da](https://github.com/tf2pickup-org/tf2pickup/commit/39403dac0abc8ea1a44a17ce97e7e0b7d2e866a2))
* stop logging routine queue and match events as errors ([#694](https://github.com/tf2pickup-org/tf2pickup/issues/694)) ([9e26269](https://github.com/tf2pickup-org/tf2pickup/commit/9e2626934de6152c3ab62d04842a97deb3e8950e)), closes [hi#volume](https://github.com/hi/issues/volume)


### Features

* report daily game launch counts to atlas ([#695](https://github.com/tf2pickup-org/tf2pickup/issues/695)) ([d1a3228](https://github.com/tf2pickup-org/tf2pickup/commit/d1a3228be89eb234553ad88edcb127520f85b1ce)), closes [atlas#1](https://github.com/atlas/issues/1) [tf2pickup-org/atlas#1](https://github.com/tf2pickup-org/atlas/issues/1)


### Performance Improvements

* serve player list query from a covering index ([#693](https://github.com/tf2pickup-org/tf2pickup/issues/693)) ([c52e59f](https://github.com/tf2pickup-org/tf2pickup/commit/c52e59f8b6b076cb43094b8dcc96b613a17b1846)), closes [#692](https://github.com/tf2pickup-org/tf2pickup/issues/692)

# [4.13.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.12.3...4.13.0) (2026-06-22)


### Features

* **branding:** add tf2pick-up.ru branding ([#691](https://github.com/tf2pickup-org/tf2pickup/issues/691)) ([a0b1034](https://github.com/tf2pickup-org/tf2pickup/commit/a0b10348403d52ce15f9119f7bb4c02890324419))

## [4.12.3](https://github.com/tf2pickup-org/tf2pickup/compare/4.12.2...4.12.3) (2026-06-22)


### Bug Fixes

* **deps:** update dependency nanoid to v5.1.14 ([0c408ba](https://github.com/tf2pickup-org/tf2pickup/commit/0c408babb5f175e1e65756d91bc2f9d365337517))
* **etf2l:** surface the real cause in scheduled task error logs ([#685](https://github.com/tf2pickup-org/tf2pickup/issues/685)) ([41ca07c](https://github.com/tf2pickup-org/tf2pickup/commit/41ca07cb67d7e6728aa70365e8d5d04d0f6d19e9)), closes [#671](https://github.com/tf2pickup-org/tf2pickup/issues/671)

## [4.12.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.12.1...4.12.2) (2026-06-18)


### Bug Fixes

* await reply.html/send/redirect to prevent double-send errors ([#677](https://github.com/tf2pickup-org/tf2pickup/issues/677)) ([74ca722](https://github.com/tf2pickup-org/tf2pickup/commit/74ca722559f696aae9b83f26f9359d1d1fa620bf))
* compute correct final score on attack/defend payload maps ([#672](https://github.com/tf2pickup-org/tf2pickup/issues/672)) ([76bc4c1](https://github.com/tf2pickup-org/tf2pickup/commit/76bc4c1470aa671ad9c52c7c57a22c2abe83ebda))
* **deps:** update dependency @fastify/otel to v0.19.0 ([3efa2bf](https://github.com/tf2pickup-org/tf2pickup/commit/3efa2bfb54b9ef5492b842e69bf962cf3ddf616f))
* **deps:** update dependency csv-parse to v7 ([#682](https://github.com/tf2pickup-org/tf2pickup/issues/682)) ([a74bc69](https://github.com/tf2pickup-org/tf2pickup/commit/a74bc692ccc61ede56d0a0a33ad5a649c649ee07))
* **deps:** update dependency csv-stringify to v6.8.0 ([4a14679](https://github.com/tf2pickup-org/tf2pickup/commit/4a1467927da438741418739110aaeb431f34a147))
* **logger:** use pino-princess as inline stream in dev ([#683](https://github.com/tf2pickup-org/tf2pickup/issues/683)) ([04f4d92](https://github.com/tf2pickup-org/tf2pickup/commit/04f4d921317e8ebcff4460818b64634a02a28265))
* **players:** fall back to default Steam avatar when avatar is missing ([#679](https://github.com/tf2pickup-org/tf2pickup/issues/679)) ([f51fac8](https://github.com/tf2pickup-org/tf2pickup/commit/f51fac8e9b7dba424217e8ffd257555240b60d1e))

## [4.12.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.12.0...4.12.1) (2026-06-16)


### Bug Fixes

* **deps:** update dependency es-toolkit to v1.47.1 ([788286e](https://github.com/tf2pickup-org/tf2pickup/commit/788286e5f55e8ea6f57ea32efa2fb325b0513d3c))
* **deps:** update dependency form-data to v4.0.6 [security] ([506d76f](https://github.com/tf2pickup-org/tf2pickup/commit/506d76fa3b5ba4cc73b61f69fdaec8d07b83fa97))
* **deps:** update tailwindcss monorepo to v4.3.1 ([20d7bb6](https://github.com/tf2pickup-org/tf2pickup/commit/20d7bb6248cea4531f091aa8ffba8b150aaf4307))

# [4.12.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.11.1...4.12.0) (2026-06-15)


### Bug Fixes

* **deps:** update dependency @fastify/rate-limit to v11 ([#662](https://github.com/tf2pickup-org/tf2pickup/issues/662)) ([83ddc6e](https://github.com/tf2pickup-org/tf2pickup/commit/83ddc6e0bda432eacbba3f12ceedc7038b165f89))
* **deps:** update dependency @fastify/request-context to v7 ([#663](https://github.com/tf2pickup-org/tf2pickup/issues/663)) ([a639568](https://github.com/tf2pickup-org/tf2pickup/commit/a63956807e5ecd4d617613965cd30eefa740fa62))
* **deps:** update dependency cssnano to v8.0.2 ([5c2c3cc](https://github.com/tf2pickup-org/tf2pickup/commit/5c2c3cc442401b666f7ae0cf1e388a342a54be05))
* **deps:** update dependency esbuild to v0.28.1 [security] ([#667](https://github.com/tf2pickup-org/tf2pickup/issues/667)) ([66ad51f](https://github.com/tf2pickup-org/tf2pickup/commit/66ad51f1070d6c597a90b8a64c3a18d6873c6d3f))
* **deps:** update dependency fastify-plugin to v6 ([#664](https://github.com/tf2pickup-org/tf2pickup/issues/664)) ([d8d4680](https://github.com/tf2pickup-org/tf2pickup/commit/d8d4680f3d94a5e699ed8f17cb68b3ddcafc6377))
* **deps:** update dependency mongodb to v7.3.0 ([f5f3f73](https://github.com/tf2pickup-org/tf2pickup/commit/f5f3f73762b0ff928a7e1b6f13edf5f62872ce69))
* **deps:** update dependency sanitize-html to v2.17.5 ([5ddc35c](https://github.com/tf2pickup-org/tf2pickup/commit/5ddc35c1c7b024a7934a74bce4486a0ebaac82fe))
* **deps:** update opentelemetry-js monorepo ([a7aa835](https://github.com/tf2pickup-org/tf2pickup/commit/a7aa835c9de0496887c5deca41db717ced4b87c1))
* **deps:** update opentelemetry-js-contrib monorepo ([#670](https://github.com/tf2pickup-org/tf2pickup/issues/670)) ([c7f045b](https://github.com/tf2pickup-org/tf2pickup/commit/c7f045b632b8cfec0655b33cae9dd0673925b168))
* notify on chat mutes and chat mute revokes ([#668](https://github.com/tf2pickup-org/tf2pickup/issues/668)) ([d33ef35](https://github.com/tf2pickup-org/tf2pickup/commit/d33ef3535ea044a1fc0be11ef05dde5bfa51bfab))
* prevent banned players from taking substitute spots ([#669](https://github.com/tf2pickup-org/tf2pickup/issues/669)) ([0cefef9](https://github.com/tf2pickup-org/tf2pickup/commit/0cefef9cdc2b989b2ede47c22911815384283fbb))


### Features

* anonymous bans ([#666](https://github.com/tf2pickup-org/tf2pickup/issues/666)) ([4ca212c](https://github.com/tf2pickup-org/tf2pickup/commit/4ca212c06f9cc54d66ee5634a27492d192c3683b))

## [4.11.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.11.0...4.11.1) (2026-06-12)


### Bug Fixes

* **atlas:** report live games count in the heartbeat ([#660](https://github.com/tf2pickup-org/tf2pickup/issues/660)) ([a822101](https://github.com/tf2pickup-org/tf2pickup/commit/a822101097214a4c002399c8246762a29196598d))
* **deps:** update dependency @tailwindcss/typography to v0.5.20 ([1667e39](https://github.com/tf2pickup-org/tf2pickup/commit/1667e39bb68c3a7ee7b828b267782ca25b81083a))

# [4.11.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.10.2...4.11.0) (2026-06-10)


### Bug Fixes

* **players:** auto verify eligible players ([#657](https://github.com/tf2pickup-org/tf2pickup/issues/657)) ([c45f3fa](https://github.com/tf2pickup-org/tf2pickup/commit/c45f3fab65308b9a0cb77990b29c9e3d52e27ce2))


### Features

* register instance on the atlas dashboard ([#658](https://github.com/tf2pickup-org/tf2pickup/issues/658)) ([6a338a4](https://github.com/tf2pickup-org/tf2pickup/commit/6a338a41aa22b83f9d633fa9ecaca0152c7621af))
* **serveme-tf:** add preferred gameserver configuration ([#659](https://github.com/tf2pickup-org/tf2pickup/issues/659)) ([5785fe0](https://github.com/tf2pickup-org/tf2pickup/commit/5785fe08bcaf99eacc4c29de49dade22b35499d1))


### Performance Improvements

* **queue:** narrow down join() critical section ([#656](https://github.com/tf2pickup-org/tf2pickup/issues/656)) ([022e462](https://github.com/tf2pickup-org/tf2pickup/commit/022e46294b5a4363f3e43145f6499fd8c6201cbd))

## [4.10.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.10.1...4.10.2) (2026-06-09)


### Performance Improvements

* **players:** per-player mutex and project out history arrays in update() ([#655](https://github.com/tf2pickup-org/tf2pickup/issues/655)) ([da30387](https://github.com/tf2pickup-org/tf2pickup/commit/da303875a129367a69e885e222d9ea3495e83398))

## [4.10.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.10.0...4.10.1) (2026-06-08)


### Bug Fixes

* **players:** fix admin toolbox layout for 9v9 config ([#654](https://github.com/tf2pickup-org/tf2pickup/issues/654)) ([48f6f65](https://github.com/tf2pickup-org/tf2pickup/commit/48f6f65f21deda00d1e957a92d1062f4466d37b0))

# [4.10.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.9.2...4.10.0) (2026-06-08)


### Features

* add admin activity log ([#650](https://github.com/tf2pickup-org/tf2pickup/issues/650)) ([fb0dea7](https://github.com/tf2pickup-org/tf2pickup/commit/fb0dea72bc75dd991db401ae10d46f435c1f2c03))

## [4.9.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.9.1...4.9.2) (2026-06-08)


### Bug Fixes

* **deps:** update dependency marked to v18.0.5 ([a24a263](https://github.com/tf2pickup-org/tf2pickup/commit/a24a263c99930e5c03ea398f7a99c5279fcbead3))

## [4.9.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.9.0...4.9.1) (2026-06-06)


### Bug Fixes

* add registration issue log context ([#652](https://github.com/tf2pickup-org/tf2pickup/issues/652)) ([a6b5064](https://github.com/tf2pickup-org/tf2pickup/commit/a6b5064eb2b0978c7a8d6bc49b4a885e330ffcd9))
* **deps:** update dependency type-fest to v5.7.0 ([d69669b](https://github.com/tf2pickup-org/tf2pickup/commit/d69669bcd68be09b8e03e3c599e64bddfcd809b6))

# [4.9.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.8.2...4.9.0) (2026-06-03)


### Bug Fixes

* show informative page when Steam profile is private ([#648](https://github.com/tf2pickup-org/tf2pickup/issues/648)) ([358132d](https://github.com/tf2pickup-org/tf2pickup/commit/358132daed378956995534073336bd15c82604e1))


### Features

* add branding for hl.tf2pickup.eu ([#649](https://github.com/tf2pickup-org/tf2pickup/issues/649)) ([f4bad2a](https://github.com/tf2pickup-org/tf2pickup/commit/f4bad2a587e82a2581c36764c64f752f3f400427))

## [4.8.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.8.1...4.8.2) (2026-06-02)


### Bug Fixes

* address dependabot alerts ([#644](https://github.com/tf2pickup-org/tf2pickup/issues/644)) ([4cb2d28](https://github.com/tf2pickup-org/tf2pickup/commit/4cb2d287a7fcf15fd7f0241f2100a4bc9188e88c))
* **deps:** update dependency date-fns to v4.4.0 ([fba1b4e](https://github.com/tf2pickup-org/tf2pickup/commit/fba1b4eb9ea95c2d44fd1710d2f69790b6566c85))
* **players:** move player verified checkbox into admin toolbox header ([#641](https://github.com/tf2pickup-org/tf2pickup/issues/641)) ([92a4f46](https://github.com/tf2pickup-org/tf2pickup/commit/92a4f46c0cd18ce58f2f1bf42b6a53fb5c384caa))

## [4.8.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.8.0...4.8.1) (2026-06-01)


### Bug Fixes

* **deps:** update dependency es-toolkit to v1.47.0 ([8fd8393](https://github.com/tf2pickup-org/tf2pickup/commit/8fd83939083c0648c57c374f8109608144d9010d))
* fix headers sent after reply warning ([#635](https://github.com/tf2pickup-org/tf2pickup/issues/635)) ([e55f9f2](https://github.com/tf2pickup-org/tf2pickup/commit/e55f9f2590abab4b1739a3da87165da758484d00))

# [4.8.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.15...4.8.0) (2026-05-28)


### Bug Fixes

* **deps:** update dependency openid to v2.0.16 ([6e8ae83](https://github.com/tf2pickup-org/tf2pickup/commit/6e8ae83b14491b00c26a677f951ca1d035d0b40a))


### Features

* **admin:** add experimental skill suggestions to admin toolbox ([#589](https://github.com/tf2pickup-org/tf2pickup/issues/589)) ([922805e](https://github.com/tf2pickup-org/tf2pickup/commit/922805e8ba4092895d82a107db3693f647d6b0f2))
* **players:** overlay skill history on ELO chart ([#592](https://github.com/tf2pickup-org/tf2pickup/issues/592)) ([de3d44b](https://github.com/tf2pickup-org/tf2pickup/commit/de3d44b24556bcc789f090521ba35191eec6c93a))

## [4.7.15](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.14...4.7.15) (2026-05-27)


### Bug Fixes

* **deps:** update dependency date-fns to v4.3.0 ([5186f2c](https://github.com/tf2pickup-org/tf2pickup/commit/5186f2c56ef66401c0ea4e2482cdb230dd037e7f))
* **deps:** update dependency ws to v8.21.0 ([42fbf69](https://github.com/tf2pickup-org/tf2pickup/commit/42fbf69718e709a9ab75f4e3584d706656df2ac7))
* pre-load sounds via data-sound-src, play via data-sound-play ([#634](https://github.com/tf2pickup-org/tf2pickup/issues/634)) ([59fb72f](https://github.com/tf2pickup-org/tf2pickup/commit/59fb72f36ccfb7ed304c820714bd91855e166bd6))

## [4.7.14](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.13...4.7.14) (2026-05-25)


### Bug Fixes

* **deps:** update dependency marked to v18.0.4 ([#622](https://github.com/tf2pickup-org/tf2pickup/issues/622)) ([0126db6](https://github.com/tf2pickup-org/tf2pickup/commit/0126db66eaf0d8e19bd987ac4b9badbfa393b98a))
* **deps:** update dependency motion to v12.40.0 ([08a5aaf](https://github.com/tf2pickup-org/tf2pickup/commit/08a5aaf8d327f5c47d8debd3e02110f7664e4753))
* **deps:** update dependency postcss to v8.5.15 ([5772529](https://github.com/tf2pickup-org/tf2pickup/commit/57725292bbbd81e57fa5a95afdfb83e9e7a29923))
* retry mumble client on socket errors ([#600](https://github.com/tf2pickup-org/tf2pickup/issues/600)) ([effd4f0](https://github.com/tf2pickup-org/tf2pickup/commit/effd4f07dfa554bab19d4e2cea5034867681deb2))

## [4.7.13](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.12...4.7.13) (2026-05-22)


### Bug Fixes

* add migration to fix players with missing avatar fields ([#630](https://github.com/tf2pickup-org/tf2pickup/issues/630)) ([cae01ab](https://github.com/tf2pickup-org/tf2pickup/commit/cae01abde5e26de4e98cbc9da37f4c899c2dd357))
* batch actor lookup in sync-clients ([#606](https://github.com/tf2pickup-org/tf2pickup/issues/606)) ([3e713b2](https://github.com/tf2pickup-org/tf2pickup/commit/3e713b2cb25a71d9ce7209019e9519a80d89ea42))
* **deps:** update dependency date-fns to v4.2.1 ([#615](https://github.com/tf2pickup-org/tf2pickup/issues/615)) ([64c9e66](https://github.com/tf2pickup-org/tf2pickup/commit/64c9e66cfd4ef0baa34ca22829d9edd6616f598d))
* **deps:** update dependency motion to v12.39.0 ([#616](https://github.com/tf2pickup-org/tf2pickup/issues/616)) ([1e1012f](https://github.com/tf2pickup-org/tf2pickup/commit/1e1012f041e7a27f69d1920f3b7d080070f75f05))
* retry server configuration up to 3 times on error ([#628](https://github.com/tf2pickup-org/tf2pickup/issues/628)) ([053afed](https://github.com/tf2pickup-org/tf2pickup/commit/053afed1f9743af93462e2a66f5cb75ec0332ea4))

## [4.7.12](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.11...4.7.12) (2026-05-20)


### Bug Fixes

* get rid of reply was already sent error ([#625](https://github.com/tf2pickup-org/tf2pickup/issues/625)) ([6a32284](https://github.com/tf2pickup-org/tf2pickup/commit/6a322843de723e8dec6c42f3329d75da62aa2d9d))
* play ready-up sound in background tabs ([#627](https://github.com/tf2pickup-org/tf2pickup/issues/627)) ([c0d3332](https://github.com/tf2pickup-org/tf2pickup/commit/c0d333221dd4dd259d9e8496d66fc1202ca30026)), closes [#623](https://github.com/tf2pickup-org/tf2pickup/issues/623)

## [4.7.11](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.10...4.7.11) (2026-05-19)


### Bug Fixes

* cleanupFriendships() performance improvements ([#620](https://github.com/tf2pickup-org/tf2pickup/issues/620)) ([f315175](https://github.com/tf2pickup-org/tf2pickup/commit/f315175bb25d4f562c17a84c2d1c2c66112eedcf))
* exclude tsx@4.22.2 from minimumReleaseAge policy ([#624](https://github.com/tf2pickup-org/tf2pickup/issues/624)) ([7d822f0](https://github.com/tf2pickup-org/tf2pickup/commit/7d822f0467cf6d628f3c952fdc2953348aba61f4))
* play mention notification sound in background tabs ([#623](https://github.com/tf2pickup-org/tf2pickup/issues/623)) ([14537d1](https://github.com/tf2pickup-org/tf2pickup/commit/14537d140cb7b3a6bd0f5227457c0a468bddb260))
* speed up player action logs with fast counts and indexes ([#601](https://github.com/tf2pickup-org/tf2pickup/issues/601)) ([7e83943](https://github.com/tf2pickup-org/tf2pickup/commit/7e83943a8327e662d932f36054b035e89631a082))

## [4.7.10](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.9...4.7.10) (2026-05-19)


### Bug Fixes

* add missing OTEL log attributes ([#619](https://github.com/tf2pickup-org/tf2pickup/issues/619)) ([6491eaa](https://github.com/tf2pickup-org/tf2pickup/commit/6491eaab8070890e26cd1b31e3792e9bae2f44e1))

## [4.7.9](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.8...4.7.9) (2026-05-18)


### Bug Fixes

* bridge pino logs to OTLP via multistream ([#613](https://github.com/tf2pickup-org/tf2pickup/issues/613)) ([b1b7920](https://github.com/tf2pickup-org/tf2pickup/commit/b1b7920c208ae88957955ff46a1448710e58f607))

## [4.7.8](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.7...4.7.8) (2026-05-18)


### Bug Fixes

* export logs via OTLP ([#611](https://github.com/tf2pickup-org/tf2pickup/issues/611)) ([8b8be0f](https://github.com/tf2pickup-org/tf2pickup/commit/8b8be0f8f890c08097068e3770d6e57d17220662))

## [4.7.7](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.6...4.7.7) (2026-05-16)


### Bug Fixes

* add OTEL metrics for queue hot path latency ([#609](https://github.com/tf2pickup-org/tf2pickup/issues/609)) ([92c6fe3](https://github.com/tf2pickup-org/tf2pickup/commit/92c6fe3804a8650bde18bb01b6127867ee7ed72d))
* **deps:** update dependency sanitize-html to v2.17.4 ([#603](https://github.com/tf2pickup-org/tf2pickup/issues/603)) ([9294ffd](https://github.com/tf2pickup-org/tf2pickup/commit/9294ffd6f0672143d5e378beca6a9f23c65cc878))
* **deps:** update opentelemetry-js monorepo to v0.218.0 ([a27e8e7](https://github.com/tf2pickup-org/tf2pickup/commit/a27e8e796d6bddd9eff5c296bb62d7dec1fb69c7))
* **deps:** update opentelemetry-js-contrib monorepo ([4c01eb2](https://github.com/tf2pickup-org/tf2pickup/commit/4c01eb2ad613932724e58a4f21891716cc1d482e))


### Performance Improvements

* trim Satoshi fonts to variable WOFF2 faces ([#607](https://github.com/tf2pickup-org/tf2pickup/issues/607)) ([a84cd38](https://github.com/tf2pickup-org/tf2pickup/commit/a84cd38de9d1278efda3327d0f93b8059cb5db4b))

## [4.7.6](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.5...4.7.6) (2026-05-13)


### Bug Fixes

* **deps:** update dependency @opentelemetry/semantic-conventions to v1.41.1 ([fd8b9b7](https://github.com/tf2pickup-org/tf2pickup/commit/fd8b9b7e2aed8c11fd045dc36cefedbc417f37e5))
* **deps:** update dependency ws to v8.20.1 ([ca63299](https://github.com/tf2pickup-org/tf2pickup/commit/ca6329992d317408d2becae16d52e14166d40b7f))
* **deps:** update linkifyjs monorepo to v4.3.3 ([a17363e](https://github.com/tf2pickup-org/tf2pickup/commit/a17363ec37f5abdd868edc8748b8dbb7953d9ec6))
* remove hyperscript dependency and replace usages ([#596](https://github.com/tf2pickup-org/tf2pickup/issues/596)) ([dd4fb3c](https://github.com/tf2pickup-org/tf2pickup/commit/dd4fb3c782c58c458eb9e1a5c163347b39361783))

## [4.7.5](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.4...4.7.5) (2026-05-11)


### Bug Fixes

* **deps:** update dependency cssnano to v8 ([#593](https://github.com/tf2pickup-org/tf2pickup/issues/593)) ([a2f77f3](https://github.com/tf2pickup-org/tf2pickup/commit/a2f77f37134b2768c102442abfc47dcec3b102b7))
* **deps:** update dependency cssnano to v8.0.1 ([9fd0dbf](https://github.com/tf2pickup-org/tf2pickup/commit/9fd0dbfd89c1c82c22ac1c7aae2e90c4f63dd8ff))
* **deps:** update opentelemetry-js monorepo to v0.217.0 ([8cfdcc1](https://github.com/tf2pickup-org/tf2pickup/commit/8cfdcc1d3fe14e4d8c7d2ee64f2943186f790920))
* **deps:** update opentelemetry-js-contrib monorepo ([c50f7d4](https://github.com/tf2pickup-org/tf2pickup/commit/c50f7d4333bced9f2b8eaf6502dd3cdfd1101413))
* **deps:** update tailwindcss monorepo to v4.3.0 ([133cb9f](https://github.com/tf2pickup-org/tf2pickup/commit/133cb9fff723dfc4eac6c59d11af0a1d19a28027))

## [4.7.4](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.3...4.7.4) (2026-05-06)


### Bug Fixes

* **deps:** update dependency cssnano to v7.1.9 ([92d855f](https://github.com/tf2pickup-org/tf2pickup/commit/92d855fc79227f650753fe1fad44b8c5af11e162))
* **deps:** update dependency postcss to v8.5.14 ([ee4549a](https://github.com/tf2pickup-org/tf2pickup/commit/ee4549a8f81a3456d04dc1d12b10842c5ae1f57e))
* **deps:** update dependency zod to v4.4.3 ([1e20d0f](https://github.com/tf2pickup-org/tf2pickup/commit/1e20d0ffeff132ece957467fb1a6f38d147c4166))
* **players:** show skill history per class, not per latest entry ([#590](https://github.com/tf2pickup-org/tf2pickup/issues/590)) ([4f46d54](https://github.com/tf2pickup-org/tf2pickup/commit/4f46d54b4409187a4eaa98bbbbff8fbdc4888e30))
* replace BEM-style CSS notation with attribute-driven variants ([#591](https://github.com/tf2pickup-org/tf2pickup/issues/591)) ([f685f93](https://github.com/tf2pickup-org/tf2pickup/commit/f685f936e0fba9760ae4551e1f76bed187b83972))

## [4.7.3](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.2...4.7.3) (2026-05-04)


### Bug Fixes

* **countdown:** use server-rendered relative duration to avoid client clock skew ([#588](https://github.com/tf2pickup-org/tf2pickup/issues/588)) ([96b26bc](https://github.com/tf2pickup-org/tf2pickup/commit/96b26bc8c38f1e148e7404cb715a38e8b5dda064)), closes [#577](https://github.com/tf2pickup-org/tf2pickup/issues/577)

## [4.7.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.1...4.7.2) (2026-05-04)


### Bug Fixes

* **deps:** update dependency country-flag-icons to v1.6.17 ([0c3a0a3](https://github.com/tf2pickup-org/tf2pickup/commit/0c3a0a3c7731a2e2358bd07a4091d47b8877526f))
* **deps:** update dependency cssnano to v7.1.8 ([95d5c53](https://github.com/tf2pickup-org/tf2pickup/commit/95d5c53860bcee6342ccdc3910ee95896a28d878))
* **deps:** update dependency discord.js to v14.26.4 ([d1d00df](https://github.com/tf2pickup-org/tf2pickup/commit/d1d00df84827bd77a3c8a11701ae26210997f768))
* **deps:** update dependency marked to v18.0.3 ([6c66533](https://github.com/tf2pickup-org/tf2pickup/commit/6c6653305f6c34ead6fb32418a3a63d8ce77a7f3))
* **deps:** update dependency nanoid to v5.1.11 ([8270431](https://github.com/tf2pickup-org/tf2pickup/commit/8270431cb12f9fc3a68bcf33fef0b97e0aa686bf))
* **deps:** update dependency postcss to v8.5.13 ([9882402](https://github.com/tf2pickup-org/tf2pickup/commit/988240290340dfeceaba1e4951b13520d4878ac4))
* **deps:** update dependency umzug to v3.8.3 ([3c677d4](https://github.com/tf2pickup-org/tf2pickup/commit/3c677d41d6458ad30b0f9e2a0a245c6d3a79f2cd))
* **deps:** update dependency zod to v4.4.2 ([b554e59](https://github.com/tf2pickup-org/tf2pickup/commit/b554e59711fb6fcc415ba05e152bfefda39133e6))
* **lint:** remove unnecessary type assertions flagged by typescript-eslint v8.59 ([#587](https://github.com/tf2pickup-org/tf2pickup/issues/587)) ([9ea3f40](https://github.com/tf2pickup-org/tf2pickup/commit/9ea3f40a01494d04dca27090881af6a90dac4651))

## [4.7.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.7.0...4.7.1) (2026-04-30)


### Bug Fixes

* **deps:** update dependency es-toolkit to v1.46.1 ([d20b9df](https://github.com/tf2pickup-org/tf2pickup/commit/d20b9df81084c53025296345694257b2427f20fd))
* **deps:** update dependency zod to v4.4.1 ([056d8f1](https://github.com/tf2pickup-org/tf2pickup/commit/056d8f19f8fcf4bce2e403f1e788f153d6900b12))
* **deps:** update opentelemetry-js monorepo ([f05cc63](https://github.com/tf2pickup-org/tf2pickup/commit/f05cc6393a1b6963e32f388fa9ecf64b918f4d17))
* **deps:** update opentelemetry-js-contrib monorepo ([f3090d3](https://github.com/tf2pickup-org/tf2pickup/commit/f3090d37d67610880bb5c33558ebd86a554632af))
* redesign admin toolbox on player profile page ([#582](https://github.com/tf2pickup-org/tf2pickup/issues/582)) ([bd3d1fd](https://github.com/tf2pickup-org/tf2pickup/commit/bd3d1fd91a2aa61c8bbc2ed5f8ab04f69ad40725))

# [4.7.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.6.1...4.7.0) (2026-04-29)


### Features

* **players:** add ELO history chart to player edit page ([#586](https://github.com/tf2pickup-org/tf2pickup/issues/586)) ([5cb6804](https://github.com/tf2pickup-org/tf2pickup/commit/5cb680456002bebcb5753efdd2f16457ba87cd3e))

## [4.6.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.6.0...4.6.1) (2026-04-27)


### Bug Fixes

* **deps:** update dependency @fastify/static to v9.1.2 ([a336f4c](https://github.com/tf2pickup-org/tf2pickup/commit/a336f4cba78dd32a04c618c325e4877e35a1ce5c))
* **deps:** update dependency @fastify/static to v9.1.3 ([#585](https://github.com/tf2pickup-org/tf2pickup/issues/585)) ([7b66e90](https://github.com/tf2pickup-org/tf2pickup/commit/7b66e90d6a23ed0a99729a81bbf82dd5aefaf190))
* **deps:** update dependency cssnano to v7.1.7 ([d41ff49](https://github.com/tf2pickup-org/tf2pickup/commit/d41ff49f7c2705e0c02dd76098312a9d47a1d71f))
* **deps:** update dependency es-toolkit to v1.46.0 ([1aa7c1c](https://github.com/tf2pickup-org/tf2pickup/commit/1aa7c1ce27e59b25f06308799d293e16171638a9))
* **deps:** update dependency htmx.org to v2.0.10 ([#583](https://github.com/tf2pickup-org/tf2pickup/issues/583)) ([5f5a3e2](https://github.com/tf2pickup-org/tf2pickup/commit/5f5a3e2315b324d9ea8c4e02037812060c9166f2))
* **deps:** update dependency mongodb to v7.2.0 ([ed54a86](https://github.com/tf2pickup-org/tf2pickup/commit/ed54a86926d0e9bc2402e83475db1feca58a072e))
* **deps:** update dependency postcss to v8.5.12 ([69db732](https://github.com/tf2pickup-org/tf2pickup/commit/69db732d07f2898917a008fc12a5c458b88c4fb1))
* **deps:** update tailwindcss monorepo to v4.2.3 ([202cc1e](https://github.com/tf2pickup-org/tf2pickup/commit/202cc1ecd34647e051f4ab404a5250c050439431))
* **deps:** update tailwindcss monorepo to v4.2.4 ([af04d0a](https://github.com/tf2pickup-org/tf2pickup/commit/af04d0aa3018619a5917b74e3c9ae111f9768963))

# [4.6.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.5...4.6.0) (2026-04-19)


### Bug Fixes

* **deps:** update dependency marked to v18.0.2 ([da41ae8](https://github.com/tf2pickup-org/tf2pickup/commit/da41ae805b50e8204afc7238d6906dd0fe67b14e))
* remove avatar view-transition animation ([#581](https://github.com/tf2pickup-org/tf2pickup/issues/581)) ([44bc83e](https://github.com/tf2pickup-org/tf2pickup/commit/44bc83e19074ac12d8bcf3f6d1f2a71f1f4e4235))


### Features

* add per-class ELO rating system ([#579](https://github.com/tf2pickup-org/tf2pickup/issues/579)) ([d34886e](https://github.com/tf2pickup-org/tf2pickup/commit/d34886e122715ada33fad2f3053a2b95425985df))

## [4.5.5](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.4...4.5.5) (2026-04-18)


### Bug Fixes

* **deps:** update dependency @fastify/multipart to v10 ([#572](https://github.com/tf2pickup-org/tf2pickup/issues/572)) ([ba58c84](https://github.com/tf2pickup-org/tf2pickup/commit/ba58c84623f537ea861b147a9608f44e26be030a))
* **deps:** update dependency @fastify/static to v9.1.1 ([5a95bab](https://github.com/tf2pickup-org/tf2pickup/commit/5a95bab76be2d042e0cda93b3d8ecb8171c24e87))
* **deps:** update dependency cssnano to v7.1.5 ([c5d5c14](https://github.com/tf2pickup-org/tf2pickup/commit/c5d5c141fe0322dfa361e86bef8afb6bf5cf43d2))
* **deps:** update dependency discord.js to v14.26.3 ([ce73624](https://github.com/tf2pickup-org/tf2pickup/commit/ce73624103891c5703eefc62d9e6ebffa42155e6))
* **deps:** update dependency fastify to v5.8.5 ([#575](https://github.com/tf2pickup-org/tf2pickup/issues/575)) ([eac8f92](https://github.com/tf2pickup-org/tf2pickup/commit/eac8f92fb0542b3bae549b2fc202b827226c3506))
* **deps:** update dependency hyperscript.org to v0.9.91 ([#574](https://github.com/tf2pickup-org/tf2pickup/issues/574)) ([6ddc8d7](https://github.com/tf2pickup-org/tf2pickup/commit/6ddc8d739506f78c06f90cf39549eb3ded383c96))
* **deps:** update dependency marked to v18 ([#571](https://github.com/tf2pickup-org/tf2pickup/issues/571)) ([362925a](https://github.com/tf2pickup-org/tf2pickup/commit/362925ab80de4a992a9712a8ef4646f27ddac42b))
* **deps:** update dependency marked to v18.0.1 ([060b6e6](https://github.com/tf2pickup-org/tf2pickup/commit/060b6e6b71949131124d64f624d55bc2ae2b229c))
* **deps:** update dependency nanoid to v5.1.9 ([5a891ff](https://github.com/tf2pickup-org/tf2pickup/commit/5a891ff47e422622774324dd772203616d22f2c2))
* **deps:** update dependency postcss to v8.5.10 ([d3d3a9e](https://github.com/tf2pickup-org/tf2pickup/commit/d3d3a9ebc8eb8a1a211e1f98c60f83b8d0654a91))
* **deps:** update dependency sanitize-html to v2.17.3 [security] ([185948e](https://github.com/tf2pickup-org/tf2pickup/commit/185948e7f0cfef4e3a7a8fdea365faac6349732e))
* **deps:** update dependency type-fest to v5.6.0 ([16dea7d](https://github.com/tf2pickup-org/tf2pickup/commit/16dea7d5cb86b1f0581d0ea1c3ee56b2b8866e1e))
* **deps:** update opentelemetry-js monorepo ([d26c948](https://github.com/tf2pickup-org/tf2pickup/commit/d26c948b9abc2e0e4c7f5dae7a0eb4fdbb68bbfe))
* **deps:** update opentelemetry-js-contrib monorepo ([535d89f](https://github.com/tf2pickup-org/tf2pickup/commit/535d89f6a2806326b8fd8bbe660839f8c1bec55a))
* use absolute deadline timestamp to prevent flicker on htmx swap ([#577](https://github.com/tf2pickup-org/tf2pickup/issues/577)) ([d810c63](https://github.com/tf2pickup-org/tf2pickup/commit/d810c63f074660e78ff3aeb88cb96b8fc29faed8))

## [4.5.4](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.3...4.5.4) (2026-04-13)


### Bug Fixes

* **deps:** update dependency @fastify/otel to v0.18.1 ([a8491ce](https://github.com/tf2pickup-org/tf2pickup/commit/a8491ce14c3f34860fcef74b52991330691ca90e))
* **deps:** update dependency @fastify/static to v9.1.0 ([3bcbfaf](https://github.com/tf2pickup-org/tf2pickup/commit/3bcbfafe638678f6e673f5c25849093a0e65d02f))
* **deps:** update dependency country-flag-icons to v1.6.16 ([a5981ed](https://github.com/tf2pickup-org/tf2pickup/commit/a5981ed9a2751e4687531f128b2f11193ff20acd))
* **deps:** update dependency dotenv to v17.4.2 ([45acefd](https://github.com/tf2pickup-org/tf2pickup/commit/45acefd9a4dd5658c2bea774f2e0286901363acb))
* **deps:** update dependency postcss to v8.5.9 ([#573](https://github.com/tf2pickup-org/tf2pickup/issues/573)) ([3e2d98a](https://github.com/tf2pickup-org/tf2pickup/commit/3e2d98affe32b111f9bc9cf5cc11c52bd916487f))

## [4.5.3](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.2...4.5.3) (2026-04-06)


### Bug Fixes

* **deps:** update dependency cssnano to v7.1.4 ([1d1de5f](https://github.com/tf2pickup-org/tf2pickup/commit/1d1de5fa560ba8d0a5edab8e3f8f39c35a784ade))
* **deps:** update dependency discord.js to v14.26.0 ([80ba96f](https://github.com/tf2pickup-org/tf2pickup/commit/80ba96f405853c89ff35c09ad008756a5a045181))
* **deps:** update dependency discord.js to v14.26.2 ([12770da](https://github.com/tf2pickup-org/tf2pickup/commit/12770da98c7f6dc5e76139a237d6d5ac90192ecb))
* **deps:** update dependency dotenv to v17.4.0 ([2b60d84](https://github.com/tf2pickup-org/tf2pickup/commit/2b60d8438c91573e735da7c6bb7f7049235e2e0d))
* **deps:** update dependency dotenv to v17.4.1 ([9e98d1b](https://github.com/tf2pickup-org/tf2pickup/commit/9e98d1bdbe434763cf834e7804a1c7ca4ac83567))
* **deps:** update dependency esbuild to v0.27.5 ([ab80967](https://github.com/tf2pickup-org/tf2pickup/commit/ab80967b61235bf2469963e375ca6efb7e1540f8))
* **deps:** update dependency esbuild to v0.28.0 ([fa6c586](https://github.com/tf2pickup-org/tf2pickup/commit/fa6c586c26e06ff56879b89777dbd987369d4296))
* **deps:** update dependency marked to v17.0.6 ([41c8701](https://github.com/tf2pickup-org/tf2pickup/commit/41c870125ee6bbb2b2b520f1a974c514112b99c7))

## [4.5.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.1...4.5.2) (2026-03-29)


### Bug Fixes

* apply queue join cooldown to self-substituting players ([#567](https://github.com/tf2pickup-org/tf2pickup/issues/567)) ([1d302bb](https://github.com/tf2pickup-org/tf2pickup/commit/1d302bb6646febfbbdcd2fa96ad075ebaf079f25))
* **queue:** prevent FUOC in sidebar tabs ([#568](https://github.com/tf2pickup-org/tf2pickup/issues/568)) ([4e0759b](https://github.com/tf2pickup-org/tf2pickup/commit/4e0759b027461ee86f1fa0d0cdd1f8a1db0d1bc0))

## [4.5.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.5.0...4.5.1) (2026-03-27)


### Bug Fixes

* **ci:** skip deploy for pull request builds ([ec07b16](https://github.com/tf2pickup-org/tf2pickup/commit/ec07b16de28b5bbc8bccaae1b7051bb11cea5351))
* extend configure timeout for quickserver servers ([#566](https://github.com/tf2pickup-org/tf2pickup/issues/566)) ([ae9109a](https://github.com/tf2pickup-org/tf2pickup/commit/ae9109adc9238dd7f7dc14bf87ed4ad01a155e2e))

# [4.5.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.4.3...4.5.0) (2026-03-27)


### Bug Fixes

* **deps:** update dependency @fastify/otel to v0.18.0 ([086bfbf](https://github.com/tf2pickup-org/tf2pickup/commit/086bfbf259a25128f9970fe00b95efe0a7f4a3e0))
* **deps:** update dependency fastify to v5.8.4 ([d7e661e](https://github.com/tf2pickup-org/tf2pickup/commit/d7e661e37d0ee5024e1a0371e020808d6e193af4))
* **deps:** update dependency mongodb to v7.1.1 ([6391130](https://github.com/tf2pickup-org/tf2pickup/commit/63911305c53f89dcbd4c44cbd62ed3f91ccaabb2))
* **deps:** update dependency type-fest to v5.5.0 ([#558](https://github.com/tf2pickup-org/tf2pickup/issues/558)) ([7c784d7](https://github.com/tf2pickup-org/tf2pickup/commit/7c784d76fb3386b8fe852768a8e4677aab276074))
* **deps:** update opentelemetry-js monorepo ([ec2d5ad](https://github.com/tf2pickup-org/tf2pickup/commit/ec2d5ade37a4bbf973da41cbff8fcd9c2e1d599a))
* **deps:** update opentelemetry-js-contrib monorepo ([8d5085e](https://github.com/tf2pickup-org/tf2pickup/commit/8d5085eac32792d11d9f2d0a176555a5d8c63197))


### Features

* **statistics:** add all time option to game launches per day chart ([#565](https://github.com/tf2pickup-org/tf2pickup/issues/565)) ([f38bc64](https://github.com/tf2pickup-org/tf2pickup/commit/f38bc646aa0783edc14ceedac2c434bc48c671b6))

## [4.4.3](https://github.com/tf2pickup-org/tf2pickup/compare/4.4.2...4.4.3) (2026-03-23)


### Bug Fixes

* **deps:** update dependency csv-parse to v6.2.1 ([3e9d17f](https://github.com/tf2pickup-org/tf2pickup/commit/3e9d17f921e031dafcc135fcacc04bcf3f4d6901))
* **deps:** update dependency marked to v17.0.5 ([204f62d](https://github.com/tf2pickup-org/tf2pickup/commit/204f62d5fd0912bf149678be1466c7c4241f7e3e))
* **deps:** update dependency ws to v8.20.0 ([75410dd](https://github.com/tf2pickup-org/tf2pickup/commit/75410ddc5f7c47554023d550a4b7268201ad0e65))

## [4.4.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.4.1...4.4.2) (2026-03-20)


### Bug Fixes

* add missing return before reply in route handlers ([#559](https://github.com/tf2pickup-org/tf2pickup/issues/559)) ([a7684e8](https://github.com/tf2pickup-org/tf2pickup/commit/a7684e8bdfa420400822ca93e6e9f81ed3647eac))
* **ci:** use github.token instead of RELEASE_TOKEN for workflow dispatch ([1274d06](https://github.com/tf2pickup-org/tf2pickup/commit/1274d06b90f80164e8a86756ff9b541424b992ce))
* **quickserver:** wait for STV to end before reusing server ([#561](https://github.com/tf2pickup-org/tf2pickup/issues/561)) ([5ed86d3](https://github.com/tf2pickup-org/tf2pickup/commit/5ed86d3b804e91deeebc43cd374c584eafbc6b17))
* **styles:** fix range input slider rendering across browsers ([#563](https://github.com/tf2pickup-org/tf2pickup/issues/563)) ([4eafd80](https://github.com/tf2pickup-org/tf2pickup/commit/4eafd80cc4acf8145515d300321f818349bbdd25))
* **twitch-tv:** exclude banned players' streams from queue page ([#562](https://github.com/tf2pickup-org/tf2pickup/issues/562)) ([3a036c2](https://github.com/tf2pickup-org/tf2pickup/commit/3a036c23c9071cab47e6eef7c001135a9b66afe9))


### Performance Improvements

* optimize QueueSlot to batch DB queries ([#551](https://github.com/tf2pickup-org/tf2pickup/issues/551)) ([5d32c8a](https://github.com/tf2pickup-org/tf2pickup/commit/5d32c8a123cdea9c64cee6a0f6527922b26028c2))

## [4.4.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.4.0...4.4.1) (2026-03-20)


### Bug Fixes

* **deps:** update dependency @fastify/otel to v0.17.1 ([9b6eb1a](https://github.com/tf2pickup-org/tf2pickup/commit/9b6eb1ac59c38891c33c81f912740cf10c436578))
* **deps:** update dependency @tf2pickup-org/mumble-client to v0.13.0 ([950243f](https://github.com/tf2pickup-org/tf2pickup/commit/950243f5853fe9be944f72a8af81792a190402ff))
* **deps:** update dependency csv-parse to v6.2.0 ([c969b49](https://github.com/tf2pickup-org/tf2pickup/commit/c969b49eff2b9bed2e275f25d3345253ce3e0eda))
* **deps:** update dependency csv-stringify to v6.7.0 ([de18252](https://github.com/tf2pickup-org/tf2pickup/commit/de1825248ca2ff2967fab4c6055c32407358d4d5))
* **deps:** update dependency motion to v12.38.0 ([8182b0c](https://github.com/tf2pickup-org/tf2pickup/commit/8182b0cb1c727cda16568b22312834e00e138c64))
* **deps:** update dependency sanitize-html to v2.17.2 ([3703a34](https://github.com/tf2pickup-org/tf2pickup/commit/3703a3473abba4e48b09dcc9c6e5f5773f750d4b))
* **deps:** update opentelemetry-js monorepo ([e2733bc](https://github.com/tf2pickup-org/tf2pickup/commit/e2733bc94b2c8a7297f219175bddd44a1fe5dea1))
* **deps:** update opentelemetry-js-contrib monorepo ([36c3863](https://github.com/tf2pickup-org/tf2pickup/commit/36c38636b2592304e8435345109ba65a71981413))
* **deps:** update tailwindcss monorepo to v4.2.2 ([defce24](https://github.com/tf2pickup-org/tf2pickup/commit/defce2468a87259c86f813c3b5109f1ddf1e12f5))
* **pick-teams:** add missing team-swap permutations for 4-player classes ([#560](https://github.com/tf2pickup-org/tf2pickup/issues/560)) ([7dd76bc](https://github.com/tf2pickup-org/tf2pickup/commit/7dd76bc604640138d226a7e8264cbdc373c55780))
* **quickserver:** initializes quickserver server with the map of the first lobby ([#556](https://github.com/tf2pickup-org/tf2pickup/issues/556)) ([79312a1](https://github.com/tf2pickup-org/tf2pickup/commit/79312a12c9225fbc47d1cf2296bf9517307206e8))

# [4.4.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.3.0...4.4.0) (2026-03-16)


### Bug Fixes

* **deps:** update dependency cssnano to v7.1.3 ([4f23a87](https://github.com/tf2pickup-org/tf2pickup/commit/4f23a8781277610ace063550ec692e0886f8d77d))
* **deps:** update dependency es-toolkit to v1.45.1 ([#547](https://github.com/tf2pickup-org/tf2pickup/issues/547)) ([89c96e6](https://github.com/tf2pickup-org/tf2pickup/commit/89c96e69ed5d5e4862f130453a8a24eb41f867fe))
* **deps:** update dependency esbuild to v0.27.4 ([c362b47](https://github.com/tf2pickup-org/tf2pickup/commit/c362b47ec6fead5e16825d352bf48c373e978df1))
* **deps:** update dependency fastify to v5.8.2 ([7bf7a34](https://github.com/tf2pickup-org/tf2pickup/commit/7bf7a345cc253b07d97773c106e651da633d528e))
* **deps:** update dependency marked to v17.0.4 ([ba7a4a7](https://github.com/tf2pickup-org/tf2pickup/commit/ba7a4a7a99832739de743ed22a0c6b6ea2419362))
* **deps:** update dependency nanoid to v5.1.7 ([a092465](https://github.com/tf2pickup-org/tf2pickup/commit/a0924656e84e706e37299d66f9143833d213569e))
* record game server reassignment actor ([#552](https://github.com/tf2pickup-org/tf2pickup/issues/552)) ([241df43](https://github.com/tf2pickup-org/tf2pickup/commit/241df4328e24fed87ecb02cef5e88882063871db))


### Features

* **queue:** add admin skill tooltip to queue slots ([#545](https://github.com/tf2pickup-org/tf2pickup/issues/545)) ([b01245b](https://github.com/tf2pickup-org/tf2pickup/commit/b01245b8944a6f6e06ad6d5fe1d735cf8e33231d))

# [4.3.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.2.0...4.3.0) (2026-03-14)


### Bug Fixes

* **static-game-servers:** respect server priority when selecting a free server ([#544](https://github.com/tf2pickup-org/tf2pickup/issues/544)) ([b1ca244](https://github.com/tf2pickup-org/tf2pickup/commit/b1ca24459bec02cbe98ae777a1bfb47c815f62b4))


### Features

* add SourceTV address and port to GameServer model and related functions ([#546](https://github.com/tf2pickup-org/tf2pickup/issues/546)) ([12f792d](https://github.com/tf2pickup-org/tf2pickup/commit/12f792d75a57d55f429177b0a22c190877a75014))

# [4.2.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.1.2...4.2.0) (2026-03-13)


### Features

* add tf2-quick-server integration ([#543](https://github.com/tf2pickup-org/tf2pickup/issues/543)) ([c6a1b37](https://github.com/tf2pickup-org/tf2pickup/commit/c6a1b379d2a9dc2f3ae5084d50f901975cd47edc))
* **queue:** add admin-only clear queue button ([#542](https://github.com/tf2pickup-org/tf2pickup/issues/542)) ([d3227c1](https://github.com/tf2pickup-org/tf2pickup/commit/d3227c14e412c9aacd7aa5633baec1162aaa1a49))

## [4.1.2](https://github.com/tf2pickup-org/tf2pickup/compare/4.1.1...4.1.2) (2026-03-11)


### Bug Fixes

* **static-game-servers:** backfill missing ids ([#539](https://github.com/tf2pickup-org/tf2pickup/issues/539)) ([5378da8](https://github.com/tf2pickup-org/tf2pickup/commit/5378da85c4647df7f4e018113cacea3efc1760e7))
* **static-game-servers:** use real IP detection via proxy headers ([#541](https://github.com/tf2pickup-org/tf2pickup/issues/541)) ([4c6948c](https://github.com/tf2pickup-org/tf2pickup/commit/4c6948c13aa8566a9afa819aa01adab8c7ab7ac1))

## [4.1.1](https://github.com/tf2pickup-org/tf2pickup/compare/4.1.0...4.1.1) (2026-03-11)


### Bug Fixes

* add static game server status change discord notifications ([#538](https://github.com/tf2pickup-org/tf2pickup/issues/538)) ([777dfe9](https://github.com/tf2pickup-org/tf2pickup/commit/777dfe910aec8a37deaba8d239a4075fc2ae54e7))

# [4.1.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.0.1...4.1.0) (2026-03-11)


### Bug Fixes

* **announcements:** sanitize HTML output to prevent XSS ([#537](https://github.com/tf2pickup-org/tf2pickup/issues/537)) ([62ede2c](https://github.com/tf2pickup-org/tf2pickup/commit/62ede2c48a5e2e48dcdad1b6a4898829e5b4ac16))
* **ci:** fetch full git history for release workflow ([#533](https://github.com/tf2pickup-org/tf2pickup/issues/533)) ([19f72e9](https://github.com/tf2pickup-org/tf2pickup/commit/19f72e9b6ed7b49974bb07aa317eccd57a73bd87))
* **discord:** prevent duplicate queue prompt messages via shared mutex ([#536](https://github.com/tf2pickup-org/tf2pickup/issues/536)) ([ad5f669](https://github.com/tf2pickup-org/tf2pickup/commit/ad5f66957ffd537a5aa4352cd187622a7ed34993))
* fix thumbnail url default value ([#532](https://github.com/tf2pickup-org/tf2pickup/issues/532)) ([6750876](https://github.com/tf2pickup-org/tf2pickup/commit/6750876d47bd29e41d69a1b4de19db6cc8773d31))
* **games:** prevent long game server names from breaking game page layout ([#534](https://github.com/tf2pickup-org/tf2pickup/issues/534)) ([d703e65](https://github.com/tf2pickup-org/tf2pickup/commit/d703e65c5b63d8173f3d4d69f86723a8ce592dce))


### Features

* emit event and notify admins on game server configure failure ([#535](https://github.com/tf2pickup-org/tf2pickup/issues/535)) ([ee752bd](https://github.com/tf2pickup-org/tf2pickup/commit/ee752bd864edaa2ea3bd1c2c05e6852da91f8596))

## 4.0.1 (2026-03-10)


### Bug Fixes

* lazy-load serveme.tf preferred region dropdown ([#531](https://github.com/tf2pickup-org/tf2pickup/issues/531)) ([85c1146](https://github.com/tf2pickup-org/tf2pickup/commit/85c114650f632d088d547259efaa17efbbe63ed0))

# [4.0.0](https://github.com/tf2pickup-org/tf2pickup/compare/4.0.0-rc.7...4.0.0) (2026-03-08)

### Features

* add tf2pickup.eu branding ([#515](https://github.com/tf2pickup-org/tf2pickup/issues/515)) ([d31d478](https://github.com/tf2pickup-org/tf2pickup/commit/d31d478787b82e3b2569dc22d1f2c10566ba7aa6))
