import { useEffect, useState, useMemo, useRef } from 'react'
import Map, { Source, Layer, useMap, MapProvider  } from 'react-map-gl'
import DeckGL from '@deck.gl/react/typed'
import { LineLayer, PointCloudLayer, IconLayer } from '@deck.gl/layers/typed'
import type { SkyLayer } from 'react-map-gl'
import mapPinPng from './assets/pin2.png'
import selectPng from './assets/select2.png'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { create } from 'zustand'
import { HeatmapLayer} from '@deck.gl/aggregation-layers/typed'

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

const INITIAL_VIEW_STATE = {
    latitude: 35.1525,
    longitude: -105.7546,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    minPitch: 0,
    maxPitch: 80,
    maxZoom: 23
}

export const useStore = create((set) => ({
    markerPosition: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
    updateMarkerPosition: (pos: any) => set(() => ({ markerPosition: pos })),
    predictionGroups: [],
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
                        predictions: pred.predictions.map((prediction: any) => ({
                            ...prediction, 
                            visible: !pred.visible 
                        }))
                    };
                    return newPred;
                }
                return pred;
            }),
        })),
}))

function App() {
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE)
    const { mainMap } = useMap()

    const [markerPosition, updateMarkerPosition] = useStore((state: any) => [
        state.markerPosition,
        state.updateMarkerPosition,
    ])
    const predictionGroups = useStore((state: any) => state.predictionGroups)

    const updateClickMarker = (props: any) => {
        console.log(props)
        const lat = parseFloat(props.coordinate[1])
        const lng = parseFloat(props.coordinate[0])
        
        var alt = mainMap.queryTerrainElevation({ lat: lat, lng: lng },{ exaggerated: false })
        
        updateMarkerPosition([
            props.coordinate[0],
            props.coordinate[1],
            //alt,
        ])   
    }

    const predictions = predictionGroups.reduce((acc: any, obj: any) => acc.concat(obj.predictions), [])

    useEffect(() => {
        console.log(markerPosition)
    }, [markerPosition])

    const predictionPointLayers = predictions.map((p: any) => {
        return new PointCloudLayer({
            id: p.id + '-point',
            data: p.points,
            getPosition: (d) => d, // @ts-ignore
            getColor: () => p.color,
            opacity: 1.0,
            pointSize: 2,
            pickable: false,
            visible: p.visible,
        })
    })

    const predictionLineLayers = predictions.map((p: any) => {
        return new LineLayer({
            id: p.id + '-line',
            data: p.segments,
            opacity: 0.8,
            getSourcePosition: (d : any) => d.start,
            getTargetPosition: (d : any) => d.end, // @ts-ignore
            getColor: () => p.color,
            getWidth: () => 3,
            pickable: false,
            visible: p.visible,
            sizeScale: 8,
        })
    })

    const predictionIconLayers = predictions.map((p: any) => {
        return new IconLayer({
            id: 'IconLayer'+p.id, // @ts-ignore
            data: p.icons,
            billboard: true,
            getColor: (d: any) => (d.start ? [50, 255, 50] : [255, 50, 50]),
            getIcon: () => 'marker',
            getPosition: (d) => d.point,
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
            getIcon: (d) => 'marker',
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
        ...predictionIconLayers
    ]

    return (
        <div className="h-screen w-screen">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={30} minSize={20} className="z-10">
                    <Sidebar />
                </Panel>
                <PanelResizeHandle className="w-2 z-10 bg-transparent -ml-1" />
                <Panel minSize={40}>
                    <div className="z-0">
                        <DeckGL
                            initialViewState={viewState}
                            controller={true}
                            layers={layers}
                            onClick={updateClickMarker}
                        >
                            <Map
                                id='mainMap'
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
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default App
