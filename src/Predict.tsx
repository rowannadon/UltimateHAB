import React, { useEffect, useState } from 'react'
// @ts-ignore
import dataCsv from './assets/data.csv'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from './components/ui/button'
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
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
import { PredictorFormSchema, InputForm } from './InputForm'
import { randomColor, rgbToHex, mapRange, adjustColor } from './util'
import { useStore } from './App'
import { ScrollArea } from './components/ui/scroll-area'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Accordion } from './components/ui/accordion'
import { AccordionContent, AccordionItem, AccordionTrigger } from '@radix-ui/react-accordion'
import { Separator } from './components/ui/separator'
import distance from '@turf/distance'
import { Progress } from './components/ui/progress'

const processPrediction = (preds: any) => {
    const predictions = []
    const c = randomColor()
    const distances : {distance: number, point: string}[] = []

    for (var pred of preds) {
        const request = pred.request
        const response = pred.response
        const ascent = response.data.prediction[0].trajectory
        const descent = response.data.prediction[1].trajectory
        const points: any = [...ascent, ...descent].map((point) => [
            point.longitude - 360,
            point.latitude,
            point.altitude,
        ])
    
        var segments: any = []
        for (var i = 0; i < points.length - 1; i++) {
            var segment = {
                start: points[i],
                end: points[i + 1],
            }
            segments.push(segment)
        }
    
        const lastPoint = points[points.length - 1]
        lastPoint[2] = 0
        points.push(lastPoint)
    
        const filteredPoints = [
            points[ascent.length],
            points[0],
            points[points.length - 1],
        ]
        const iconPoints = [
            { point: points[0], start: true },
            { point: points[points.length - 1], start: false },
        ]

        const id = uuid()
    
        const result = {
            id: id,
            visible: true,
            color: c,
            request: request,
            points: filteredPoints,
            segments: segments,
            icons: iconPoints,
        }
    
        distances.push({
            point: id,
            distance: distance(points[0], points[points.length-1])
        })

        predictions.push(result)
    }
    var modifiedPredictions = predictions;
    if (predictions.length > 1) {
        const distanceArray = distances.map((d)=> d.distance)
        const minDistance = Math.min(...distanceArray)
        const maxDistance = Math.max(...distanceArray)
    
        let map = new Map(distances.map((d : any) => [d.point, mapRange(d.distance, minDistance, maxDistance, -50, 50)]));
    
        modifiedPredictions = predictions.map(pred => {
            if (map.has(pred.id)) {
                return {...pred, color: adjustColor(pred.color, map.get(pred.id))};
            } else {
                return pred;
            }
        })
    
        console.log(modifiedPredictions)
    }

    const result = {
        id: uuid(),
        visible: true,
        color: c,
        predictions: modifiedPredictions
    }

    return result
}

const generateMultiplePredictionRequests = (data: any) => {
    const ascent_rate = parseFloat(data.ascent_rate)
    const ascent_rate_range = parseFloat(data.ascent_rate_range)
    const descent_rate = parseFloat(data.descent_rate)
    const descent_rate_range = parseFloat(data.descent_rate_range)
    const burst_altitude = parseFloat(data.burst_altitude)
    const burst_altitude_range = parseFloat(data.burst_altitude_range)
    const datetime = Date.parse(data.launch_datetime)
    const datetime_range_hrs = parseInt(data.launch_datetime_range)

    const start_ascent_rate = ascent_rate - 0.5*ascent_rate_range
    const start_descent_rate = descent_rate - 0.5*descent_rate_range
    const start_burst_altitude = burst_altitude - 0.5*burst_altitude_range
    const start_datetime = datetime - 3600000*0.5*datetime_range_hrs

    const end_ascent_rate = ascent_rate + 0.5*ascent_rate_range
    const end_descent_rate = descent_rate + 0.5*descent_rate_range
    const end_burst_altitude = burst_altitude + 0.5*burst_altitude_range
    const end_datetime = datetime + 3600000*0.5*datetime_range_hrs

    const ascent_rate_inc = 1
    const descent_rate_inc = 2
    const burst_altitude_inc = 1000
    const datetime_inc = 3600000 * 1

    const arr : any = []
    for (var i = start_ascent_rate; i <= end_ascent_rate; i += ascent_rate_inc) {
        for (var j = start_descent_rate; j <= end_descent_rate; j += descent_rate_inc) {
            for (var k = start_burst_altitude; k <= end_burst_altitude; k += burst_altitude_inc) {
                for (var t = start_datetime; t <= end_datetime; t += datetime_inc) {
                    const req = {
                        profile: 'standard_profile',
                        pred_type: 'single',
                        launch_latitude: parseFloat(data.launch_latitude).toFixed(4),
                        launch_longitude: (parseFloat(data.launch_longitude) + 360).toFixed(
                            4,
                        ),
                        launch_altitude: parseFloat(data.launch_altitude),
                        launch_datetime: new Date(t).toISOString(),
                        ascent_rate: i.toFixed(4),
                        descent_rate: j.toFixed(4),
                        burst_altitude: k.toFixed(4)
                    }
                    arr.push(req)
                }
            }
        }
    }
    
    return arr
}

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

    const encodeGetParams = (p: any) =>
        Object.entries(p) //@ts-ignore
            .map((kv) => kv.map(encodeURIComponent).join('='))
            .join('&')

    async function onSubmit(data: z.infer<typeof PredictorFormSchema>) {
        setLoadingPrediction(true)
        if (
            parseFloat(data.ascent_rate_range) > 0 ||
            parseFloat(data.burst_altitude_range) > 0 ||
            parseFloat(data.descent_rate_range) > 0 ||
            parseFloat(data.launch_datetime_range) > 0
        ) {
            const requests : Array<any> = generateMultiplePredictionRequests(data)
            const res : Array<any> = []

            for (var i = 0; i < requests.length; i++) {
                const response = await axios.get('http://localhost:5173/api?' + encodeGetParams(requests[i]))
                const progress = Math.round((i / requests.length) *100)
                setPredictionProgress(progress)
                if (response.data.prediction) {
                    res.push({
                        request: requests[i],
                        response: response
                    })
                }
            }

            addPredictionGroup(processPrediction(res))

            setMultiOpen(false)
            setSingleOpen(false)
            setLoadingPrediction(false)
            setPredictionProgress(0)


        } else {
            const request = {
                profile: 'standard_profile',
                pred_type: 'single',
                launch_latitude: parseFloat(data.launch_latitude).toFixed(4),
                launch_longitude: (parseFloat(data.launch_longitude) + 360).toFixed(
                    4,
                ),
                launch_altitude: parseFloat(data.launch_altitude),
                launch_datetime: data.launch_datetime,
                ascent_rate: parseFloat(data.ascent_rate),
                descent_rate: parseFloat(data.descent_rate),
                burst_altitude: parseFloat(data.burst_altitude),
            }

            axios
            .get('http://localhost:5173/api?' + encodeGetParams(request))
            .then((response) => {
                if (response.data.prediction) {
                    addPredictionGroup(processPrediction([{
                        request: request,
                        response: response
                    }]))
                    setMultiOpen(false)
                    setSingleOpen(false)
                }
            })
            .finally(() => {
                setLoadingPrediction(false)
            })
        }
        
    }

    const PredictionGroup = (props: any) => {
        const predictionElements = props.data.predictions.map((pred: any, index: any) => {
            const date = new Date(Date.parse(pred.request.launch_datetime))

            return(<div key={pred.id} className='pl-2 pr-2 min-w-[200px] flex flex-col justify-center'>
                {index > 0 && <Separator className='mb-1' />}
                <p className="text-sm">{`${date.toDateString()}, ${date.toLocaleTimeString()}`}</p>
                <div className="flex flex-row flex-wrap space-x-4 text-[10px] text-slate-500">
                    <p>
                        {'['}
                        {
                            parseFloat(pred.request.launch_latitude).toFixed(2)
                        }, {(parseFloat(pred.request.launch_longitude)-360).toFixed(2)}
                        {']'}
                    </p>
                    <p className="flex flex-row items-center">
                        {parseFloat(pred.request.launch_altitude).toFixed(0)}{' '}
                        <ArrowRight className="w-3 h-3" />{' '}
                        {parseFloat(pred.request.burst_altitude).toFixed(0)} m
                    </p>
                    <div className="flex flex-row items-center space-x-2">
                        <div className="flex flex-row items-center">
                            <ArrowUp className="w-3 h-3" />
                            {parseFloat(pred.request.ascent_rate).toFixed(1)} m/s
                        </div>
                        <div className="flex flex-row items-center">
                            <ArrowDown className="w-3 h-3" />
                            {parseFloat(pred.request.descent_rate).toFixed(1)} m/s
                        </div>
                    </div>
                </div>
            </div>)
        })

        return (
            <AccordionItem value={props.data.id} className='w-full'>
                <AccordionTrigger className='w-full' asChild>
                    <Card className='hover:cursor-pointer hover:bg-slate-100'>
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
                                    {/* {props.visible ? (
                                        <Eye className="h-5 w-5" />
                                    ) : (
                                        <EyeOff className="w-5 h-5" />
                                    )} */}
                                </Card>
                            </div>
                            <div className='w-full p-2'>
                                {props.data.predictions.length > 1 ? `${props.data.predictions.length} Predictions` : `${props.data.predictions.length} Prediction`}
                            </div>
                            <div className='flex flex-row space-x-2'>
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
        <div className="flex flex-col space-y-2 p-2 bg-slate-100 flex-grow">
            {/* <Card className="w-full">
                <InputForm
                    loading={loadingPrediction}
                    onSubmit={onSubmit}
                    onMapPinButton={props.onMapPinButton}
                />
            </Card> */}
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
                        </DialogContent>
                    </Dialog>
                    <Dialog open={multiOpen} onOpenChange={setMultiOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-9 h-9 p-0">
                                <CopyPlus />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogTitle>Create Multi Prediction</DialogTitle>
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
            <Card className="flex flex-grow flex-col space-y-2 p-2 max-h-[calc(100vh-7.5rem)] overflow-y-auto">
                <Accordion type="single" collapsible className="w-full space-y-2">
                    {predictionGroups.map((predictionGroup: any) => (
                        <PredictionGroup
                            data={predictionGroup}
                            visible={predictionGroup.visible}
                            key={predictionGroup.id}
                            color={rgbToHex(predictionGroup.color)}
                            toggle={() => togglePredictionGroupVisibility(predictionGroup.id)}
                            delete={() => removePredictionGroup(predictionGroup.id)}
                        />
                    ))}
                </Accordion>
            </Card>
        </div>
    )
}
