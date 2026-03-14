# Changelog

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
