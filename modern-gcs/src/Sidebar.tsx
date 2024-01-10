import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Predict } from './Predict'
import { Flight } from './Flight'

export const Sidebar = (props: any) => {
    return (
        <div className="flex flex-grow flex-col bg-background space-y-0 w-full">
            <Tabs defaultValue="predict" className="flex flex-col bg-slate-100 w-full">
                <TabsList className="flex flex-row w-full bg-slate-100">
                    <TabsTrigger className="basis-1/2" value="predict">
                        Predict
                    </TabsTrigger>
                    <TabsTrigger className="basis-1/2" value="flight">
                        Flight
                    </TabsTrigger>
                </TabsList>
                <TabsContent className="flex flex-grow m-0" value="predict">
                    <Predict localMap={props.localMap} onChangeLocalMap={props.onChangeLocalMap} />
                </TabsContent>
                <TabsContent className="flex flex-grow m-0" value="flight">
                    <Flight />
                </TabsContent>
            </Tabs>
        </div>
    )
}
