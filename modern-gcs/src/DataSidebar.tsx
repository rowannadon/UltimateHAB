import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { DataCharts } from './DataCharts'

export const DataSidebar = () => {
    return (
        <div className="bg-background space-y-0 h-full">
            <Tabs defaultValue="data" className="h-full flex flex-col space-y-0">
                <TabsList className="flex flex-row items-center w-full">
                    <TabsTrigger className="flex-grow" value="data">
                        Data
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="data" className='flex h-full flex-grow'>
                    <DataCharts />
                </TabsContent>
            </Tabs>
        </div>
    )
}
