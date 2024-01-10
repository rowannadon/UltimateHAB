import { useState } from 'react'
// @ts-ignore
import dataCsv from './assets/data.csv'
import { Card } from '@/components/ui/card'
import { Button } from './components/ui/button'
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    BarChart,
    Eye,
    EyeOff,
    Loader2,
    Play,
    Trash,
} from 'lucide-react'
import * as z from 'zod'
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@radix-ui/react-accordion'
import { Separator } from './components/ui/separator'
import { socket } from './socket'
import { Popover, PopoverTrigger } from './components/ui/popover'
import { PopoverContent } from '@radix-ui/react-popover'
import { SimulationForm, SimulationFormSchema } from './SimulationForm'

export const PredictionUIElement = (props: any) => {
    const [simulationMenuOpen, setSimulationMenuOpen] = useState<boolean>()
    const simulationRunning = props.simulationRunning
    const setSimulationRunning = props.setSimulationRunning

    const predictionElements = props.data.predictions.map(
        (pred: any, index: any) => {
            const date = new Date(Date.parse(pred.request.launch_datetime))

            return (
                <div
                    key={pred.id}
                    className="pl-2 pr-2 min-w-[200px] flex flex-col justify-center"
                >
                    {index > 0 && <Separator className="mb-1" />}
                    <p className="text-sm">{`${date.toDateString()}, ${date.toLocaleTimeString()}`}</p>
                    <div className="flex flex-row flex-wrap space-x-4 text-[10px] text-slate-500">
                        <p>
                            {'['}
                            {parseFloat(
                                pred.request.launch_latitude,
                            ).toFixed(2)}
                            ,{' '}
                            {(
                                parseFloat(pred.request.launch_longitude) -
                                360
                            ).toFixed(2)}
                            {']'}
                        </p>
                        <p className="flex flex-row items-center">
                            {parseFloat(
                                pred.request.launch_altitude,
                            ).toFixed(0)}{' '}
                            <ArrowRight className="w-3 h-3" />{' '}
                            {parseFloat(
                                pred.request.burst_altitude,
                            ).toFixed(0)}{' '}
                            m
                        </p>
                        <div className="flex flex-row items-center space-x-2">
                            <div className="flex flex-row items-center">
                                <ArrowUp className="w-3 h-3" />
                                {parseFloat(
                                    pred.request.ascent_rate,
                                ).toFixed(1)}{' '}
                                m/s
                            </div>
                            <div className="flex flex-row items-center">
                                <ArrowDown className="w-3 h-3" />
                                {parseFloat(
                                    pred.request.descent_rate,
                                ).toFixed(1)}{' '}
                                m/s
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
    )

    return (
        <AccordionItem value={props.data.id} className="w-full">
            <AccordionTrigger className="w-full" asChild>
                <Card className="hover:cursor-pointer hover:bg-slate-50">
                    <div
                        className="flex min-w-[30px] flex-row rounded-sm justify-between p-2 items-center text-sm"
                        key={props.text}
                    >
                        <div className="flex flex-row space-x-2 items-center">
                            <Card
                                style={{
                                    backgroundColor: props.color,
                                }}
                                className="w-8 p-0 h-8"
                            >
                            </Card>
                        </div>
                        <div className="w-full p-2">
                            <p>
                                {`${props.data.predictions.length}:
                                  [${
                                      props.data.minDistance ===
                                      props.data.maxDistance
                                          ? props.data.maxDistance.toFixed(
                                                1,
                                            )
                                          : props.data.maxDistance.toFixed(
                                                1,
                                            ) +
                                            '-' +
                                            props.data.minDistance.toFixed(
                                                1,
                                            )
                                  }] mi`}
                            </p>
                        </div>
                        <div className="flex flex-row space-x-2">
                            <Button 
                                variant="outline" 
                                disabled={simulationRunning} 
                                className='w-9 h-9 p-0'
                                onClick={() => {
                                    if (!simulationRunning) {
                                        socket.emit('startSimulation', props.data.id, 10, Date.now())
                                        setSimulationRunning(true)
                                    }
                                }}
                            >
                                {simulationRunning && (
                                    <Loader2 className="animate-spin" />
                                )}
                                {!simulationRunning && <Play className='w-5 h-5' />}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-9 p-0 h-9"
                                onClick={(e) => {
                                    e.preventDefault()
                                    props.toggle()
                                }}
                            >
                                {props.visible ? (
                                    <Eye className="h-5 w-5" />
                                ) : (
                                    <EyeOff className="w-5 h-5" />
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-9 p-0 h-9"
                                onClick={(e) => {
                                    e.preventDefault()
                                    props.delete()
                                }}
                            >
                                <Trash className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </Card>
            </AccordionTrigger>
            <AccordionContent>
                <Card className="flex flex-col p-2 rounded-t-none border-t-0 ml-3 mr-3 space-y-2">
                    {predictionElements}
                </Card>
            </AccordionContent>
        </AccordionItem>
    )
}
