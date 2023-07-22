import { useEffect, useState, useMemo, useRef } from 'react'
import Map, { Source, Layer, useMap, MapProvider } from 'react-map-gl'
import DeckGL from '@deck.gl/react/typed'
import { MapView, FirstPersonView } from '@deck.gl/core/typed'
import { LineLayer, PointCloudLayer, IconLayer } from '@deck.gl/layers/typed'
import type { SkyLayer } from 'react-map-gl'
import mapPinPng from './assets/pin2.png'
import selectPng from './assets/select2.png'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { HeatmapLayer } from '@deck.gl/aggregation-layers/typed'
import { DataPoint, Prediction, PredictionGroup, useDataStore, useStore } from './StateStore'
import { INITIAL_VIEW_STATE } from './StateStore'
import axios from 'axios'
import { socket } from './socket'
import { DeckMap } from './DeckMap'

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

function App() {
    const predictionGroups = useStore((state: any) => state.predictionGroups)

    useEffect(() => {
        if (predictionGroups.length > 0) {
            console.log('saving groups...')
            socket.emit('updatePredictions', predictionGroups)
        }
    }, [predictionGroups])

    useEffect(() => {
        console.log('getting groups')
        socket.emit('getAllPredictions')
    }, [])

    return (
        <div className="h-screen w-screen">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={50} minSize={20} className="z-10 w-[600px]">
                    <Sidebar />
                </Panel>
                <PanelResizeHandle className="w-2 z-10 bg-transparent -ml-1" />
                <Panel minSize={0}>
                    <DeckMap />
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default App
