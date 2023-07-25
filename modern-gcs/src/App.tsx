import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { useStore } from './StateStore'
import { socket } from './socket'
import { DeckMap } from './DeckMap'
import { DataSidebar } from './DataSidebar'

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
                <Panel defaultSize={30} minSize={20} className="z-10 w-[500px] h-screen">
                    <Sidebar />
                </Panel>
                <PanelResizeHandle className="w-2 z-10 bg-transparent -ml-1" />
                <Panel minSize={0}>
                    <DeckMap />
                </Panel>
                <Panel defaultSize={30} minSize={20} className="z-10">
                    <DataSidebar />
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default App
