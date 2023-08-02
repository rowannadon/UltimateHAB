import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Sidebar } from './Sidebar'
import { DeckMap } from './DeckMap'
import { DataSidebar } from './DataSidebar'

function App() {
    return (
        <div className="h-screen w-screen">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={20} minSize={15} className="z-10 h-screen left-0">
                    <Sidebar />
                </Panel>
                <PanelResizeHandle className="w-2 z-10 bg-transparent -ml-1" />
                <Panel minSize={0}>
                    <DeckMap />
                </Panel>
                <Panel defaultSize={30} minSize={20} className="absolute z-10 h-screen w-[300px] right-0">
                    <DataSidebar />
                </Panel>
            </PanelGroup>
        </div>
    )
}

export default App
