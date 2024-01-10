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
import { InputForm } from './InputForm'
import {PredictorFormSchema} from './StateStore'
import { ColorConverter } from './util'
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
import { Progress } from './components/ui/progress'
import { socket } from './socket'
import { PredictionUIElement } from './PredictionUIElement'
import { Switch } from './components/ui/switch'
import { Label } from './components/ui/label'

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
        if (predictionGroups.length > 0) {
            console.log('saving groups...')
            socket.emit('updatePredictions', predictionGroups)
        }
    }, [predictionGroups])

    useEffect(() => {
        console.log('getting groups')
        socket.emit('getAllPredictions')
    }, [])

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

    return (
        <div className="flex flex-col space-y-2 p-2 bg-slate-100 flex-grow h-[calc(100vh-2.5rem)]">
            <Card className="flex flex-row p-2 justify-between align-middle">
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
                <div className="space-x-2 p-[5px] align-center">
                    {/* <Button variant="outline" className="w-9 h-9 p-0">
                        <Eye />
                    </Button>
                    <Button variant="outline" className="w-9 h-9 p-0">
                        <Trash />
                    </Button> */}
                    <Label>Local Map</Label>
                    <Switch checked={props.localMap} onCheckedChange={(c) => props.onChangeLocalMap(c)} />
                </div>
            </Card>
            <Card className="flex flex-grow flex-col space-y-2 p-2 overflow-y-auto">
                <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-2"
                >
                    {predictionGroups.map((predictionGroup: any) => (
                        <PredictionUIElement
                            data={predictionGroup}
                            visible={predictionGroup.visible}
                            key={predictionGroup.id}
                            color={ColorConverter.toHex(predictionGroup.color)}
                            setSimulationRunning={setSimulationRunning}
                            simulationRunning={simulationRunning}
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
