import { create } from 'zustand'
import { Color } from './util'
import { Point } from 'mapbox-gl'
import * as z from 'zod'

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
    latitude: 35.6858,
    longitude: -105.9622,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    minPitch: 0,
    maxPitch: 85,
    maxZoom: 23,
}

export interface SimDataPoint {
    id: string
    time: number
    oldTime: number
    position: MapPoint3D
    atmosphere: AtmosphereData
    velocity: number
    internalTemp: number
    RSSI: number
    hVelocity: number
    voltage: number
}

export interface DataPoint {
    id: string
    humidity: number,
    tempExtAht: number,
    tempExtDallas: number,
    tempIntDallas: number,
    tempIntBmp: number,
    pressure: number,
    pressureAlt: number,
    voltage: number,
    sats: number,
    lat: number,
    lng: number,
    gpsAlt: number,
    time: number,
    hVelocity: number,
    vVelocity: number,
}

export interface AtmosphereData {
    temperature: number
    density: number
    pressure: number
    viscosity: number
    ssound: number
    rh: number
}

export interface SimulationRun {
    dataPoints: SimDataPoint[]
    waitTimes: number[]
    id: string
    startTime: number
    multiple: string
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

export const useMarkerStore = create((set) => ({
    markerPosition: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude, 0],
    updateMarkerPosition: (pos: any) => set(() => ({ markerPosition: pos })),
}))

export const useGroundPositionStore = create((set) => ({
    groundPosition: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude, 0],
    updateGroundPosition: (pos: any) => set(() => ({ groundPosition: pos })),
}))

export const usePositionStore = create((set) => ({
    currentPositionsBuffer: [],
    positionChunks: [],
    setCurrentPositionsBuffer: (buffer: string) => set(() => ({ setCurrentPositionsBuffer: buffer })),
    resetCurrentPositionsBuffer: () => set((state: any) => ({ currentPositionsBuffer: state.currentPositionsBuffer.slice(-1)})),
    setPositionChunks: (pos: any) => set((state: any) => ({ positionChunks: [state.positionChunks, ...pos] })),
    addPosition: (pos: any) => set((state: any) => ({ currentPositionsBuffer: [...state.currentPositionsBuffer, pos] })),
}))

export const useStore = create((set) => ({
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
