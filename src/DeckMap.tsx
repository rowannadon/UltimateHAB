import { useEffect, useState, useRef } from 'react'
import Map, { Source, useMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react/typed'
import { LineLayer, PointCloudLayer, IconLayer } from '@deck.gl/layers/typed'
import type { SkyLayer } from 'react-map-gl'
import mapPinPng from './assets/pin2.png'
import selectPng from './assets/select2.png'
import { DataPoint, PredictionGroup, useDataStore, useStore } from './StateStore'
import { INITIAL_VIEW_STATE } from './StateStore'
import { socket } from './socket'

const TOKEN =
    'pk.eyJ1Ijoicm5hZG9uIiwiYSI6ImNsanFsMmQ0MTA2b3MzZHJzYmtva3ZibTYifQ.LHUT3prMZ0y-zlrnhO307Q' // Set your mapbox token here

const skyLayer: SkyLayer = {
    id: 'sky',
    type: 'sky',
    paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 0.0],
        'sky-atmosphere-sun-intensity': 15,
    },
}

export function DeckMap() {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
    const { mainMap } = useMap()
    const [markerPosition, updateMarkerPosition] = useStore((state: any) => [state.markerPosition, state.updateMarkerPosition])

    const [predictionGroups, setPredictionGroups] = useStore((state: any) => [
        state.predictionGroups,
        state.setPredictionGroups,
    ])

    const addDataPoint = useDataStore((state: any) => state.addDataPoint)

    useEffect(() => {
        // Assuming yourSocket is the instance created in the previous step
        if (socket) {
            const simulationProgress = (simProg: DataPoint) => {
                updateMarkerPosition([
                    simProg.position.lng,
                    simProg.position.lat,
                    simProg.position.alt,
                ])
                addDataPoint(simProg)
            }

            const updatePredictionGroups = (predictions: PredictionGroup[]) => {
                console.log(predictions)
                if (predictionGroups !== predictions) {
                    setPredictionGroups(predictions)
                }
            }

            socket.on('simulationProgress', simulationProgress)
            socket.on('allPredictions', updatePredictionGroups)

            // Clean up the event listeners when the component unmounts
            return () => {
                socket.off('simulationProgress', simulationProgress)
                socket.off('allPredictions', updatePredictionGroups)
            }
        }
    }, [socket])

    const updateClickMarker = (props: any) => {
        const lat = parseFloat(props.coordinate[1])
        const lng = parseFloat(props.coordinate[0])

        var alt = mainMap.queryTerrainElevation(
            { lat: lat, lng: lng },
            { exaggerated: false },
        )

        updateMarkerPosition([props.coordinate[0], props.coordinate[1], 0])
    }

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
            getSize: () => 4,
            iconAtlas: mapPinPng,
            iconMapping: {
                marker: {
                    x: 0,
                    y: 0,
                    width: 344,
                    height: 545,
                    anchorY: 545,
                    mask: true,
                },
            },
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
            getSize: () => 4,
            iconAtlas: mapPinPng,
            iconMapping: {
                marker: {
                    x: 0,
                    y: 0,
                    width: 344,
                    height: 545,
                    anchorY: 545,
                    mask: true,
                },
            },
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
            getColor: (d) => [200, 50, 50],
            getIcon: (d) => 'marker', // @ts-ignore
            getPosition: (d) => markerPosition,
            getSize: (d) => 3,
            iconAtlas: selectPng,
            iconMapping: {
                marker: {
                    x: 0,
                    y: 0,
                    width: 483,
                    height: 483,
                    anchorY: 241,
                    anchorX: 241,
                    mask: true,
                },
            },
            sizeScale: 10,
        }),
        ...predictionLineLayers,
        ...predictionPointLayers,
        ...predictionStartIconLayers,
        ...predictionEndIconLayers,
    ]

    return (
        <div className="z-0">
            <DeckGL
                initialViewState={viewState}
                controller={true}
                layers={layers}
                onClick={updateClickMarker}
            >
                <Map
                    id="mainMap"
                    reuseMaps
                    styleDiffing={false}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                    mapboxAccessToken={TOKEN}
                    terrain={{
                        source: 'mapbox-dem',
                        exaggeration: 1.0,
                    }}
                >
                    <Source
                        id="mapbox-dem"
                        type="raster-dem"
                        url="mapbox://mapbox.mapbox-terrain-dem-v1"
                        tileSize={512}
                        maxzoom={14}
                    />
                    {/* <Layer {...skyLayer} /> */}
                </Map>
            </DeckGL>
        </div>
    )
}