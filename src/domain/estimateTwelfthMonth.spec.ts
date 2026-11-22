import { describe, expect, it } from 'vitest'

import { monthEntry as month } from './monthEntry.testHelper'
import { estimatedIndexes, writeEstimate } from './estimateTwelfthMonth'

const julyHchp = month({
  electricity: { tariffMode: 'hchp', mainHcPrevious: 0, mainHc: 30, mainHpPrevious: 0, mainHp: 70 },
})
const prevAugustBase = month({
  electricity: { tariffMode: 'base', mainBasePrevious: 100, mainBase: 110 },
})

describe('writeEstimate', () => {
  it('uses the previous August delta, totalled over HC + HP, on the Base register', () => {
    const prevAugust = month({
      electricity: {
        tariffMode: 'hchp',
        mainHcPrevious: 1,
        mainHc: 3,
        mainHpPrevious: 1,
        mainHp: 6,
      },
    })
    const next = month({ electricity: { tariffMode: 'base', mainBasePrevious: 200 } })
    writeEstimate(next, julyHchp, prevAugust)
    expect(next.electricity.mainBase).toBe(207)
  })

  it('splits the delta 30 / 70 when August is in hchp', () => {
    const next = month({
      electricity: { tariffMode: 'hchp', mainHcPrevious: 10, mainHpPrevious: 20 },
    })
    writeEstimate(next, julyHchp, prevAugustBase)
    expect(next.electricity.mainHc).toBe(13)
    expect(next.electricity.mainHp).toBe(27)
  })

  it('falls back to July with no previous file', () => {
    const next = month({ electricity: { tariffMode: 'base', mainBasePrevious: 5 } })
    writeEstimate(next, julyHchp)
    expect(next.electricity.mainBase).toBe(105)
  })

  it('falls back to July for a meter missing from the previous August only', () => {
    const july = month({
      electricity: {
        tariffMode: 'base',
        mainBasePrevious: 0,
        mainBase: 20,
        studioBasePrevious: 0,
        studioBase: 4,
      },
    })
    const next = month({
      electricity: { tariffMode: 'base', mainBasePrevious: 20, studioBasePrevious: 4 },
    })
    writeEstimate(next, july, prevAugustBase)
    expect(next.electricity.mainBase).toBe(30)
    expect(next.electricity.studioBase).toBe(8)
  })

  it('keeps water estimates whole litres', () => {
    const july = month({ waterConsumption: { mainMeterPrevious: 0, mainMeter: 10.4 } })
    const next = month({ waterConsumption: { mainMeterPrevious: 100.2 } })
    writeEstimate(next, july)
    expect(next.waterConsumption.mainMeter).toBe(111)
  })

  it('marks the month as estimated', () => {
    const next = month()
    writeEstimate(next, month())
    expect(next.common.estimated).toBe(true)
  })
})

describe('estimatedIndexes', () => {
  it('lists the current indexes present, by line id, and nothing else', () => {
    const next = month({
      waterConsumption: { mainMeterPrevious: 5, mainMeter: 9 },
      electricity: { tariffMode: 'hchp', mainHcPrevious: 1, mainHc: 2.5, mainHp: 4 },
    })
    expect(estimatedIndexes(next)).toEqual({
      'waterConsumption.mainMeter': 9,
      'electricity.mainHc': 2.5,
      'electricity.mainHp': 4,
    })
  })
})
