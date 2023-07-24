import { create } from 'zustand'
import { Color } from './util'
import { Point } from 'mapbox-gl'
import * as z from 'zod'
import {produce} from 'immer';

export interface MapPoint3D {
    lng: number,
    lat: number,
    alt: number,
}

export interface Segment {
    start: MapPoint3D
    end: MapPoint3D
}

export interface PredictionGroup {
    id: string
    visible: boolean
    color: Color
    minDistance: number
    maxDistance: number
    predictions: Prediction[]
}

export interface Prediction {
    id: string
    visible: boolean
    color: Color
    request: PredictionApiRequest
    points: MapPoint3D[]
    filteredPoints: MapPoint3D[]
    segments: Segment[]
    times: string[]
    startPoint: MapPoint3D
    endPoint: MapPoint3D
}

Point

export interface PredictionApiRequest {
    profile: 'standard_profile' | 'float_profile'
    pred_type: 'single'
    launch_latitude: string
    launch_longitude: string
    launch_altitude: string
    launch_datetime: string
    ascent_rate: string
    descent_rate: string
    burst_altitude: string
}

export interface PredictionApiPoint {
    altitude: number
    datetime: string
    latitude: number
    longitude: number
}

export interface PredictionApiStage {
    stage: 'ascent' | 'descent'
    trajectory: PredictionApiPoint[]
}

export interface PredictionApiResponse {
    prediction: PredictionApiStage[]
}

export interface PredictionApiRequestResponse {
    request: PredictionApiRequest
    response: PredictionApiResponse
}

export const INITIAL_VIEW_STATE = {
    latitude: 35.1525,
    longitude: -105.7546,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    minPitch: 0,
    maxPitch: 80,
    maxZoom: 23,
}

export const PredictorFormSchema = z.object({
    launch_latitude: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
    launch_longitude: z
        .string()
        .refine((val) => !Number.isNaN(parseFloat(val))),
    launch_altitude: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
    launch_datetime: z.string(),
    launch_datetime_range: z.string(),
    burst_altitude: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
    burst_altitude_range: z
        .string()
        .refine((val) => !Number.isNaN(parseFloat(val))),
    ascent_rate: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
    ascent_rate_range: z
        .string()
        .refine((val) => !Number.isNaN(parseFloat(val))),
    descent_rate: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
    descent_rate_range: z
        .string()
        .refine((val) => !Number.isNaN(parseFloat(val))),
})

export const useStore = create((set) => ({
    markerPosition: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude, 0],
    updateMarkerPosition: (pos: any) => set(() => ({ markerPosition: pos })),
    predictionGroups: [],
    setPredictionGroups: (predictionGroups: any) => {
        set((state: any) => ({
            predictionGroups: predictionGroups,
        }))
    },
    addPredictionGroup: (predictionGroup: any) => {
        set((state: any) => ({
            predictionGroups: [...state.predictionGroups, predictionGroup],
        }))
    },
    removePredictionGroup: (id: any) =>
        set((state: any) => ({
            predictionGroups: state.predictionGroups.filter(
                (predictionGroup: any) => predictionGroup.id !== id,
            ),
        })),
    togglePredictionGroupVisibility: (id: any) =>
        set((state: any) => ({
            predictionGroups: state.predictionGroups.map((pred: any) => {
                if (pred.id === id) {
                    const newPred = {
                        ...pred,
                        visible: !pred.visible,
                        predictions: pred.predictions.map(
                            (prediction: any) => ({
                                ...prediction,
                                visible: !pred.visible,
                            }),
                        ),
                    }
                    return newPred
                }
                return pred
            }),
        })),
}))

export interface DataPoint {
    id: string
    time: number
    position: MapPoint3D
    atmosphere: AtmosphereData
    velocity: number
    hVelocity: number
}

export interface AtmosphereData {
    temperature: number
    density: number
    pressure: number
    viscosity: number
    ssound: number
    rh: number
}

// export type DataStoreState = {
//     startTime: number,
//     setStartTime: (time: number) => void
//     data: any[];
//     addDataPoint: (dataPoint: DataPoint) => void
//     setDataPoints: (dataPoints: DataPoint[]) => void
// };

export interface SimulationRun {
    dataPoints: DataPoint[]
    waitTimes: number[]
    id: string
    startTime: number
}

// export const useDataStore = create<DataStoreState>((set, get) => ({
//     startTime: 0,
//     setStartTime: (time: number) => {
//         set((state: any) => ({
//             startTime: time,
//         }))
//     },
//     data: <DataPoint[]>[],
//     addDataPoint: (dataPoint: DataPoint) => {
//         set((state: any) => ({
//             data: [...state.data, dataPoint],
//         }))
//     },
//     setDataPoints: (dataPoints: DataPoint[]) => {
//         set((state: any) => ({
//             data: dataPoints,
//         }))
//     }
// }))
