import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { DataCharts } from './DataCharts'
import { HistoryCharts } from './HistoryCharts'

export const DataSidebar = () => {
    return (
        <div className="flex flex-col bg-background space-y-0 h-full w-[300px] bg-slate-100">
            <Tabs defaultValue="data" className="h-full space-y-0 top-0">
                <TabsList className="flex flex-row w-full bg-slate-100">
                    <TabsTrigger className="flex-grow" value="data">
                        Live Data
                    </TabsTrigger>
                    <TabsTrigger className="flex-grow" value="history">
                        Log
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="data" className='flex flex-grow m-0'>
                    <DataCharts />
                </TabsContent>
                <TabsContent value="history" className='flex flex-grow m-0'>
                    <HistoryCharts />
                </TabsContent>
            </Tabs>
        </div>
    )
}
