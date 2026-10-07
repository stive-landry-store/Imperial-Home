import { describe, expect, it } from 'vitest'
import { groundedReply } from './assistant'
import { demoProperties } from './demo'

describe('grounded assistant', () => {
  it('does not invent availability', () => {
    const r = groundedReply({
      question: 'Is the villa free next weekend?',
      lang: 'en',
      properties: demoProperties,
      reservations: [],
      phone: '+237 674 09 22 63',
      email: 'imperialhome237@gmail.com',
    })
    expect(r.answer.toLowerCase()).toContain('calendar')
    expect(r.escalate).toBe(false)
  })

  it('answers with published rates', () => {
    const r = groundedReply({
      question: 'What are the prices in XAF?',
      lang: 'en',
      properties: demoProperties,
      reservations: [],
      phone: '+237',
      email: 'a@b.c',
    })
    expect(r.answer).toContain('55')
  })
})
