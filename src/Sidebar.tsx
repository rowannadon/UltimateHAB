import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Predict } from './Predict'
import { Flight } from './Flight'

export const Sidebar = () => {
    return (
        <div className="flex flex-col bg-background space-y-0">
            <Tabs defaultValue="predict" className="flex flex-col bg-background">
                <TabsList className="flex flex-row w-full ml-2 mr-2">
                    <TabsTrigger className="basis-1/2" value="predict">
                        Predict
                    </TabsTrigger>
                    <TabsTrigger className="basis-1/2" value="flight">
                        Flight
                    </TabsTrigger>
                </TabsList>
                <TabsContent className="flex flex-grow m-0" value="predict">
                    <Predict />
                </TabsContent>
                <TabsContent className="flex flex-grow m-0" value="flight">
                    <Flight />
                </TabsContent>
            </Tabs>
        </div>
    )
}
