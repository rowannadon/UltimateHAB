import React, { useEffect, useState } from 'react'
// @ts-ignore
import dataCsv from './assets/data.csv'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from './components/ui/button'
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    BarChart,
    Camera,
    CopyPlus,
    Eye,
    EyeOff,
    FilePlus,
    Plus,
    Trash,
} from 'lucide-react'
import * as z from 'zod'
import axios from 'axios'
import uuid from 'react-uuid'
import { InputForm } from './InputForm'
import {PredictorFormSchema} from './StateStore'
import { Color, ColorConverter, mapRange } from './util'
import {
    PredictionGroup,
    useStore,
} from './StateStore'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Accordion } from './components/ui/accordion'
import {
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@radix-ui/react-accordion'
import { Separator } from './components/ui/separator'
import { Progress } from './components/ui/progress'
import { socket } from './socket'
import { Popover, PopoverTrigger } from './components/ui/popover'
import { PopoverContent } from '@radix-ui/react-popover'
import { SimulationForm, SimulationFormSchema } from './SimulationForm'

export const Predict = (props: any) => {
    const [loadingPrediction, setLoadingPrediction] = useState(false)
    const [
        predictionGroups,
        addPredictionGroup,
        removePredictionGroup,
        togglePredictionGroupVisibility,
    ] = useStore((state: any) => [
        state.predictionGroups,
        state.addPredictionGroup,
        state.removePredictionGroup,
        state.togglePredictionGroupVisibility,
    ])
    const [multiOpen, setMultiOpen] = useState(false)
    const [singleOpen, setSingleOpen] = useState(false)
    const [predictionProgress, setPredictionProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState('')
    const [simulationRunning, setSimulationRunning] = useState(false)

    async function onSubmit(data: z.infer<typeof PredictorFormSchema>) {
        socket.emit('makePrediction', data)
        setLoadingPrediction(true)
        setErrorMessage('')
    }

    useEffect(() => {
        if (socket) {
            const updatePredictionProgress = (progress: any) => {
                setPredictionProgress(progress)
            }

            const updatePredictionError = (err: any) => {
                console.log(err)
                setErrorMessage(err.message)
                setLoadingPrediction(false)
                setPredictionProgress(0)
            }

            const newPrediction = (group: PredictionGroup) => {
                console.log(group)
                addPredictionGroup(group)
                setLoadingPrediction(false)
                setPredictionProgress(0)
                setSingleOpen(false)
                setMultiOpen(false)
            }

            const endSimulation = () => {
                setSimulationRunning(false)
            }

            socket.on('predictionProgress', updatePredictionProgress)
            socket.on('predictionError', updatePredictionError)
            socket.on('newPrediction', newPrediction)
            socket.on('endSimulation', endSimulation)

            return () => {
                socket.off('predictionProgress', updatePredictionProgress)
                socket.off('predictionError', updatePredictionError)
                socket.off('newPrediction', newPrediction)
                socket.off('endSimulation', endSimulation)
            }
        }
    }, [socket])

    const PredictionGroupElement = (props: any) => {
        const [simulationMenuOpen, setSimulationMenuOpen] = useState<boolean>()

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

        const SimulationMenu = (props : any) => {
            return (
                <Popover open={props.open} >
                    <PopoverTrigger asChild >
                        <Button
                            variant="outline"
                            className="w-9 p-0 h-9"
                            onClick={(e) => {
                                e.preventDefault()
                                setSimulationMenuOpen(!props.open)
                            }}
                        >
                            <BarChart className='w-5 y-5' />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className='-mt-1'>
                        <Card >
                            <SimulationForm onSubmit={(data: z.infer<typeof SimulationFormSchema>) => {
                                if (!simulationRunning) {
                                    socket.emit('startSimulation', props.id, data.minutes, Date.now())
                                    setSimulationRunning(true)
                                }
                            }} loading={simulationRunning} />
                        </Card>
                        
                    </PopoverContent>
                </Popover >
            )
        }

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
                                <SimulationMenu open={simulationMenuOpen} id={props.data.id} />
                                
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

    return (
        <div className="flex flex-col space-y-2 p-2 bg-slate-100 flex-grow h-[calc(100vh-2.5rem)]">
            <Card className="flex flex-row p-2 justify-between">
                <div className="space-x-2">
                    <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-9 h-9 p-0">
                                <FilePlus />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Create Single Prediction</DialogTitle>
                            <InputForm
                                loading={loadingPrediction}
                                onSubmit={onSubmit}
                                type="single"
                            />
                            <div className='flex text-sm text-red-400 pl-3'>
                                {errorMessage}
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={multiOpen} onOpenChange={setMultiOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-9 h-9 p-0">
                                <CopyPlus />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Create Multiple Predictions</DialogTitle>
                            <InputForm
                                loading={loadingPrediction}
                                onSubmit={onSubmit}
                                type="multi"
                            />
                            <Progress value={predictionProgress} />
                        </DialogContent>
                    </Dialog>
                </div>
                <div className="space-x-2">
                    <Button variant="outline" className="w-9 h-9 p-0">
                        <Eye />
                    </Button>
                    <Button variant="outline" className="w-9 h-9 p-0">
                        <Trash />
                    </Button>
                </div>
            </Card>
            <Card className="flex flex-grow flex-col space-y-2 p-2 overflow-y-auto">
                <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-2"
                >
                    {predictionGroups.map((predictionGroup: any) => (
                        <PredictionGroupElement
                            data={predictionGroup}
                            visible={predictionGroup.visible}
                            key={predictionGroup.id}
                            color={ColorConverter.toHex(predictionGroup.color)}
                            toggle={() =>
                                togglePredictionGroupVisibility(
                                    predictionGroup.id,
                                )
                            }
                            delete={() => {
                                console.log('deleting: ', predictionGroup.id)
                                socket.emit('deletePrediction', predictionGroup.id)
                                removePredictionGroup(predictionGroup.id)
                            }}
                        />
                    ))}
                </Accordion>
            </Card>
        </div>
    )
}
