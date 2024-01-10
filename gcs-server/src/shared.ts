import { SimulationRun } from '../../modern-gcs/src/StateStore'

export const vehicles = new Map<
    String,
    { run: SimulationRun; ac: AbortController }
>()

