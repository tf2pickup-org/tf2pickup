import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import type { GameNumber } from '../../../database/models/game.model'
import type { SubstituteRequestModel } from '../../../database/models/substitute-request.model'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Tf2Team } from '../../../shared/types/tf2-team'

const substituteRequests = vi.hoisted(() => ({ requests: [] as SubstituteRequestModel[] }))

vi.mock('../../../database/collections', () => ({
  collections: {
    gamesSubstituteRequests: {
      find: () => ({ toArray: () => Promise.resolve(substituteRequests.requests) }),
    },
  },
}))

vi.mock('../../../players', () => ({ players: {} }))

import { SubstitutionRequests } from './substitution-requests'

function request(team: Tf2Team, gameClass: Tf2ClassName, gameNumber: number) {
  return {
    gameNumber: gameNumber as GameNumber,
    slotId: `${team}-${gameClass}-1`,
    team,
    gameClass,
  } satisfies SubstituteRequestModel
}

describe('SubstitutionRequests', () => {
  it('names the class and the game of every open request', async () => {
    substituteRequests.requests = [request(Tf2Team.red, Tf2ClassName.demoman, 26)]

    const root = parse(await SubstitutionRequests())
    const banner = root.querySelector('#substitution-requests .banner')!

    expect(banner.querySelector('p')!.text.replace(/\s+/g, ' ').trim()).toBe(
      'Team RED needs a substitute for demoman in game #26',
    )
    expect(banner.querySelector('img')!.getAttribute('src')).toBe(
      '/game-class-icons/demoman-64x64.png',
    )
    expect(banner.querySelector('a')!.getAttribute('href')).toBe('/games/26')
  })

  it('stacks the message above the button instead of squeezing it into a narrow column', async () => {
    substituteRequests.requests = [request(Tf2Team.blu, Tf2ClassName.medic, 27)]

    const root = parse(await SubstitutionRequests())
    const banner = root.querySelector('#substitution-requests .banner')!
    const classes = banner.getAttribute('class')!.split(' ')

    // the row layout kicks in only at md and up; below that .banner stacks its children
    expect(classes).toContain('md:flex-row')
    expect(classes.includes('flex-row')).toBe(false)
  })
})
