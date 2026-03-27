# Changelog

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
