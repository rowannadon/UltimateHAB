import { useEffect, useState } from 'react'
import Map, { Source, useMap } from 'react-map-gl/maplibre'
import Map2, { Source as Source2 } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css';
import DeckGL from '@deck.gl/react/typed'
import {COORDINATE_SYSTEM} from '@deck.gl/core/typed';
import { LineLayer, PointCloudLayer, IconLayer } from '@deck.gl/layers/typed'
import type { SkyLayer } from 'react-map-gl'
import mapPinPng from './assets/pin2.png'
import selectPng from './assets/select2.png'
import { DataPoint, PredictionGroup, usePositionStore, useGroundPositionStore, useMarkerStore, useStore } from './StateStore'
import { INITIAL_VIEW_STATE } from './StateStore'
import { socket } from './socket'
import { mapRange, chunkArray } from './util';
import { Button } from './components/ui/button';
import { Crosshair } from 'lucide-react';

const TOKEN = 'pk.eyJ1Ijoicm5hZG9uIiwiYSI6ImNsa2tmczNtcjAydGEza212b3lpcXBqb2gifQ.9_7-4h5yxZOpJNh_7RvpoA' 

const pointIconMapping = {
    marker: {
        x: 0,
        y: 0,
        width: 64,
        height: 101,
        anchorY: 101,
        mask: true,
    },
}

const markerIconMapping = {
    marker: {
        x: 0,
        y: 0,
        width: 128,
        height: 128,
        anchorY: 64,
        anchorX: 64,
        mask: true,
    }
}

export function DeckMap(props: any) {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
    const [activeSimulation, setActiveSimulation] = useState('')

    const [offset, setOffset] = useState(0);

    const mainMap = useMap();

    const [markerPosition, updateMarkerPosition] = useMarkerStore((state: any) => [
        state.markerPosition, 
        state.updateMarkerPosition
    ])

    const [groundPosition, updateGroundPosition] = useGroundPositionStore((state: any) => [
        state.groundPosition, 
        state.updateGroundPosition
    ])

    const [predictionGroups, setPredictionGroups] = useStore((state: any) => [
        state.predictionGroups,
        state.setPredictionGroups,
    ])

    const [currentPositionsBuffer, setCurrentPositionsBuffer, positionChunks, setPositionChunks, addPosition, resetCurrentPositionsBuffer] = usePositionStore((state: any) => [
        state.currentPositionsBuffer,
        state.setCurrentPositionsBuffer,
        state.positionChunks,
        state.setPositionChunks,
        state.addPosition,
        state.resetCurrentPositionsBuffer,
    ])


    useEffect(() => {
        const children = document.querySelectorAll('[mapboxgl-children]').item(0)
        if (children) {
            children.setAttribute('style', 'display: hidden')
        }
    }, [mainMap])

    useEffect(() => {
        if (socket) {
            const newDataPoint = (id: string, data: DataPoint) => {
                if (data.id.slice(0, 6) !== 'Serial') {

                }
                updateMarkerPosition([
                    data.lng,
                    data.lat,
                    data.gpsAlt - offset,
                ])
                
                if (activeSimulation !== data.id) {
                    if (data.id.slice(0, 6) === 'Serial') {
                        setOffset(2140);
                    } else {
                        setOffset(0);
                    }
                    setActiveSimulation(data.id)
                    setCurrentPositionsBuffer([])
                    setPositionChunks([[data]])
                    console.log(activeSimulation)
                    
                    socket.emit('getSimulationPoints2', data.id)
                } else {
                    if (currentPositionsBuffer.length > 25) {
                        positionChunks.push(currentPositionsBuffer);
                        resetCurrentPositionsBuffer();
                    }
                    addPosition(data);
                }
            }

            const setSimulationPoints = (points: DataPoint[]) => {
                points.sort(function(a, b) {
                    return a.time - b.time;
                });
                console.log(points)
                const chunked = chunkArray(points, 25);
                setPositionChunks(chunked);
            }

            const updatePredictionGroups = (predictions: PredictionGroup[]) => {
                console.log(predictions)
                if (predictionGroups !== predictions) {
                    setPredictionGroups(predictions)
                }
            }

            const newGroundPosition = (pos: any) => {
                console.log('updating ground position ', pos)
                updateGroundPosition([
                    pos.lng,
                    pos.lat,
                    pos.alt - offset
                ])
            }

            socket.on('newDataPoint', newDataPoint)
            socket.on('allPredictions', updatePredictionGroups)
            socket.on('groundPosition', newGroundPosition)
            socket.on('simulationPoints2', setSimulationPoints)

            return () => {
                socket.off('newDataPoint', newDataPoint)
                socket.off('allPredictions', updatePredictionGroups)
                socket.off('groundPosition', newGroundPosition),
                socket.off('simulationPoints2', setSimulationPoints)
            }
        }
    }, [socket, activeSimulation, currentPositionsBuffer, positionChunks, predictionGroups])

    const updateClickMarker = (props: any) => {
        const lat = parseFloat(props.coordinate[1])
        const lng = parseFloat(props.coordinate[0])

        const alt = mainMap.mapBoxMap.queryTerrainElevation([lng, lat])
        console.log(alt)


        updateMarkerPosition([props.coordinate[0], props.coordinate[1], 0])
    }

    // useEffect(() => {
    //     console.log(markerPosition)
    // }, [markerPosition])

    const predictions = predictionGroups.reduce(
        (acc: any, obj: any) => acc.concat(obj.predictions),
        [],
    )

    const predictionPointLayers = predictions.map((p: any) => {
        return new PointCloudLayer({
            id: p.id + '-point',
            data: p.points,
            getPosition: (d) => [d.lng, d.lat, d.alt], // @ts-ignore
            getColor: () => [p.color.r, p.color.g, p.color.b],
            opacity: 1.0,
            pointSize: 1,
            pickable: false,
            visible: p.visible,
        })
    })

    const predictionLineLayers = predictions.map((p: any) => {
        return new LineLayer({
            id: p.id + '-line',
            data: p.segments,
            opacity: 0.8,
            getSourcePosition: (d: any) => [
                d.start.lng,
                d.start.lat,
                d.start.alt,
            ],
            getTargetPosition: (d: any) => [d.end.lng, d.end.lat, d.end.alt], // @ts-ignore
            getColor: () => [p.color.r, p.color.g, p.color.b],
            getWidth: () => 2,
            pickable: false,
            visible: p.visible,
            sizeScale: 8,
        })
    })

    const currentPositionsLineLayer = positionChunks.map((chunk: any, chunkIndex: number) => chunk.map((p: any, index: number) => {
        return new LineLayer({
            id: p.id + '-line-' + chunkIndex + '-' + index,
            data: chunk,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            opacity: 0.8,
            getSourcePosition: (d: any) => [
                p.lng,
                p.lat,
                p.gpsAlt- offset,
            ],
            getTargetPosition: (d: any) => [
                chunk[index+1] ? chunk[index+1].lng : p.lng,
                chunk[index+1] ? chunk[index+1].lat : p.lat,
                chunk[index+1] ? chunk[index+1].gpsAlt - offset: p.gpsAlt - offset,
            ], // @ts-ignore
            getColor: () => [mapRange(p.tempExtDallas, -60, 30, 0, 255), 128, 255],
            getWidth: () => 2,
            pickable: false,
            visible: true,
            sizeScale: 8,
        })
    }))

    const currentPositionsLineLayerBuffer = currentPositionsBuffer.map((p: any, index: number) => {
        return new LineLayer({
            id: p.id + '-bufferLine-' + index,
            data: currentPositionsBuffer,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            opacity: 0.8,
            getSourcePosition: (d: any) => [
                p.lng,
                p.lat,
                p.gpsAlt - offset,
            ],
            getTargetPosition: (d: any) => [
                currentPositionsBuffer[index+1] ? currentPositionsBuffer[index+1].lng : p.lng,
                currentPositionsBuffer[index+1] ? currentPositionsBuffer[index+1].lat : p.lat,
                currentPositionsBuffer[index+1] ? currentPositionsBuffer[index+1].gpsAlt - offset: p.gpsAlt - offset,
            ], // @ts-ignore
            getColor: () => [mapRange(p.tempExtDallas, -60, 30, 0, 255), 255, 50],
            getWidth: () => 2,
            pickable: false,
            visible: true,
            sizeScale: 8,
        })
    })

    const predictionStartIconLayers = predictions.map((p: any) => {
        return new IconLayer({
            id: 'StartIconLayer' + p.id, // @ts-ignore
            data: [p.startPoint.lng, p.startPoint.lat, p.startPoint.alt],
            billboard: true,
            getColor: (d) => [50, 200, 50],
            getIcon: () => 'marker',
            getPosition: (d: any) => [
                p.startPoint.lng,
                p.startPoint.lat,
                p.startPoint.alt,
            ],
            getSize: () => 3,
            iconAtlas: mapPinPng,
            iconMapping: pointIconMapping,
            opacity: 0.8,
            sizeScale: 10,
            visible: p.visible,
        })
    })

    const predictionEndIconLayers = predictions.map((p: any) => {
        return new IconLayer({
            id: 'EndIconLayer' + p.id, // @ts-ignore
            data: [p.endPoint.lng, p.endPoint.lat, p.endPoint.alt],
            billboard: true,
            getColor: (d) => [200, 50, 50],
            getIcon: () => 'marker',
            getPosition: (d: any) => [
                p.endPoint.lng,
                p.endPoint.lat,
                p.endPoint.alt,
            ],
            getSize: () => 3,
            iconAtlas: mapPinPng,
            iconMapping: pointIconMapping,
            opacity: 0.8,
            sizeScale: 10,
            visible: p.visible,
        })
    })

    const layers = [
        new IconLayer({
            id: 'IconLayer',
            billboard: true,
            data: markerPosition,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            getColor: (d) => [200, 50, 50],
            getIcon: (d) => 'marker', // @ts-ignore
            getPosition: (d) => markerPosition,
            getSize: (d) => 2,
            iconAtlas: selectPng,
            iconMapping: markerIconMapping,
            sizeScale: 10,
        }),
        new IconLayer({
            id: 'IconLayer2',
            billboard: true,
            data: groundPosition,
            coordinateSystem: COORDINATE_SYSTEM.LNGLAT,
            getColor: (d) => [50, 50, 200],
            getIcon: (d) => 'marker', // @ts-ignore
            getPosition: (d) => groundPosition,
            getSize: (d) => 2,
            iconAtlas: selectPng,
            iconMapping: markerIconMapping,
            sizeScale: 10,
        }),
        ...predictionLineLayers,
        ...predictionPointLayers,
        ...predictionStartIconLayers,
        ...predictionEndIconLayers,
        ...currentPositionsLineLayer,
        ...currentPositionsLineLayerBuffer
    ]

    return (
        <div className="z-0 overflow-clip">
            <Button onClick={() => {
                setViewState((prev) => ({
                    latitude: markerPosition[1],
                    longitude: markerPosition[0],
                    zoom: prev.zoom,
                    pitch: prev.pitch,
                    bearing: prev.bearing,
                    minPitch: prev.minPitch,
                    maxPitch: prev.maxPitch,
                    maxZoom: prev.maxZoom,
                }))
            }} variant='secondary' className="w-9 h-9 p-0 absolute left-[370px] bottom-[10px] z-50">
                <Crosshair color='#C83232' />
            </Button>
            <Button onClick={() => {
                setViewState((prev) => ({
                    latitude: groundPosition[1],
                    longitude: groundPosition[0],
                    zoom: prev.zoom,
                    pitch: prev.pitch,
                    bearing: prev.bearing,
                    minPitch: prev.minPitch,
                    maxPitch: prev.maxPitch,
                    maxZoom: prev.maxZoom,
                }))
            }} variant='secondary' className="w-9 h-9 p-0 absolute left-[415px] bottom-[10px] z-50">
                <Crosshair color='#3232C8' />
            </Button>
            <DeckGL
                initialViewState={viewState}
                controller={true}
                layers={layers}
                onClick={updateClickMarker}
            >
                {props.localMap && <Map
                    id="localMap"
                    reuseMaps
                    styleDiffing={false}
                    mapStyle="map/styles/basic-preview/style.json"
                    minPitch={viewState.minPitch}
                    maxPitch={viewState.maxPitch}
                    attributionControl={false}
                >
                    <Source
                        id="map-tiles"
                        type="raster"
                        tiles={["map/styles/basic-preview/{z}/{x}/{y}.png"]}
                        tileSize={512}
                        maxzoom={viewState.maxZoom}
                    />
                </Map>}

                {!props.localMap && <Map2
                    id="mapBoxMap"
                    reuseMaps
                    styleDiffing={false}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                    mapboxAccessToken={TOKEN}
                    terrain={{
                        source: 'mapbox-dem',
                        exaggeration: 1.0,
                    }}
                    fog={{
                        range: [0.8, 20],
                        color: "#d6f4ff",
                        "horizon-blend": 0.04,
                    }}
                >
                    {!props.localMap && <Source2
                        id="mapbox-dem"
                        type="raster-dem"
                        url="mapbox://mapbox.mapbox-terrain-dem-v1"
                        tileSize={512}
                        maxzoom={viewState.maxZoom}
                    />}
                </Map2>}
            </DeckGL>
        </div>
    )
}
