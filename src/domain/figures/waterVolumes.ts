import type { WaterConsumptionInputs } from '@/domain/periodFile'
import { allDefined, sum, type Figure } from './figureMath'

// A water index is typed in litres; a delta is in m³.
function delta(current: Figure, previous: Figure): Figure {
  const operands = allDefined(current, previous)
  return operands && (operands[0] - operands[1]) / 1000
}

// The volumes both water sections bill: consumption and treatment.
export function waterVolumes(water: WaterConsumptionInputs) {
  const deltaMain = delta(water.mainMeter, water.mainMeterPrevious)
  const deltaStudioUnsoftened = delta(
    water.studioUnsoftenedMeter,
    water.studioUnsoftenedMeterPrevious,
  )
  const deltaStudioSoftened = delta(water.studioSoftenedMeter, water.studioSoftenedMeterPrevious)
  const studioDeltas = allDefined(deltaStudioUnsoftened, deltaStudioSoftened)
  const studioVolume = studioDeltas && sum(studioDeltas)
  return { deltaMain, deltaStudioUnsoftened, deltaStudioSoftened, studioVolume }
}
