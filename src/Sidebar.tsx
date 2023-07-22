import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from './components/ui/progress'
import { Button } from './components/ui/button'
import { Camera } from 'lucide-react'
import { Predict } from './Predict'
import { DataCharts } from './DataCharts'

export const Sidebar = () => {
    return (
        <div className="bg-background space-y-0 h-full">
            <Tabs defaultValue="predict" className="h-full flex flex-col space-y-0">
                <TabsList className="flex flex-row items-center w-full">
                    <TabsTrigger className="basis-1/3 text-center" value="predict">
                        Predict
                    </TabsTrigger>
                    <TabsTrigger className="basis-1/3" value="flight">
                        Flight
                    </TabsTrigger>
                    <TabsTrigger className="basis-1/3" value="data">
                        Data
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="predict" className="flex flex-grow">
                    <Predict />
                </TabsContent>
                <TabsContent className="p-4" value="flight">
                    <Card className="w-full aspect-video my-2">
                        <CardContent></CardContent>
                    </Card>
                    <div className="flex flex-row items-center">
                        <Progress value={33} className="mr-2" />
                        <Button variant="ghost" className="w-9 p-0 h-9">
                            <Camera className="h-5 w-5" />
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="data">
                    <DataCharts />
                </TabsContent>
            </Tabs>
        </div>
    )
}
