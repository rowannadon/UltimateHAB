import { Sidebar } from './Sidebar'
import { DeckMap } from './DeckMap'
import { DataSidebar } from './DataSidebar'
import { useState } from 'react'

function App() {
    const [localMap, setLocalMap] = useState(false)

    return (
        <div className="flex flex-row h-screen w-screen">
            <div className='flex h-full w-[640px] z-10 left-0 bg-slate-400'>
                <Sidebar localMap={localMap} onChangeLocalMap={(c: boolean) => setLocalMap(c)} />
            </div>
            <div className='flex flex-grow w-full z-0'>
                <DeckMap localMap={localMap} />
            </div>
            <div className='flex h-full w-[400px] z-10 right-0 bg-slate-400'>
                <DataSidebar />
            </div>
        </div>
    )
}

export default App
