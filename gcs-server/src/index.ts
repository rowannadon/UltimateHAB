import { Server } from "socket.io";
import {DataPoint, MapPoint3D, PredictionApiRequest, PredictionGroup, SimulationRun} from '../../modern-gcs/src/StateStore'
import {Level} from 'level'
import standardAtmosphere from 'standard-atmosphere'
import {find} from 'geo-tz'
import { makePredictionApiRequests, generateMultiplePredictionRequests, processPredictions } from "./predictionProcessor";
import { v4 as uuid } from 'uuid'
import distance from '@turf/distance'

const port = 3001
const io = new Server(port)
const db = new Level('mydb', { valueEncoding: 'json' })

const runningSimulations = new Map<String, {run: SimulationRun, ac: AbortController}>()

io.on("connection", (socket) => {
    

    const addPredictionGroup = (group: PredictionGroup) => {
        const req = {
            type: 'put',
            key: `pGroup${group.id}`,
            value: group
        }
        
        // @ts-ignore - update the DB
        db.batch([req])

        // send new prediction to front end
        socket.emit('newPrediction', group)
    }

    // request for time zone
    socket.on("getTimeZone", (lat, lon) => {
        socket.emit('timeZone', find(parseFloat(lon), parseFloat(lat)))
    });

    // create a prediction from input form data, store it
    socket.on("makePrediction", (data) => {
        if (
            parseFloat(data.ascent_rate_range) > 0 ||
            parseFloat(data.burst_altitude_range) > 0 ||
            parseFloat(data.descent_rate_range) > 0 ||
            parseFloat(data.launch_datetime_range) > 0
        ) {
            const requests: PredictionApiRequest[] =
                generateMultiplePredictionRequests(data)
            makePredictionApiRequests(requests, (progress) => socket.emit('predictionProgress', progress)).then(
                (requestResponses) => {
                    const newGroup: PredictionGroup = processPredictions(requestResponses)
                    addPredictionGroup(newGroup)
                }
            ).catch(err => {
                console.log(err)
                socket.emit('predictionError', err)
            })
        } else {
            const request: PredictionApiRequest = {
                pred_type: 'single',
                profile: 'standard_profile',
                launch_latitude: parseFloat(data.launch_latitude).toFixed(4),
                launch_longitude: (
                    parseFloat(data.launch_longitude) + 360
                ).toFixed(4),
                launch_altitude: parseFloat(data.launch_altitude).toFixed(4),
                launch_datetime: data.launch_datetime,
                ascent_rate: parseFloat(data.ascent_rate).toFixed(4),
                descent_rate: parseFloat(data.descent_rate).toFixed(4),
                burst_altitude: parseFloat(data.burst_altitude).toFixed(4),
            }

            makePredictionApiRequests([request], () => null).then(
                (requestResponses) => {
                    const newGroup: PredictionGroup = processPredictions(requestResponses)
                    addPredictionGroup(newGroup)
                }
            ).catch(err => {
                console.log(err)
                // tell front end about the error
                socket.emit('predictionError', err)
            })
        }
    })

    const getPredictions = async () => {
        const items = []
        for await (const [key, value] of db.iterator({gte: 'pGroup'})) {
            items.push(value)
        }
        return items
    }

    // send most up to date predictions to front end
    socket.on("getAllPredictions", () => {
        getPredictions().then((items) => {
            console.log('sending items:')
            console.log(items)
            socket.emit('allPredictions', items)
        })
    });

    socket.on("deletePrediction", (id) => {
        console.log('deleting item: ')
        console.log(id)
        db.del(`pGroup${id}`)
    });

    socket.on("startSimulation", async (groupId: string, duration_minutes: string, startTime: number) => {
        const run: SimulationRun = await createSimulationRun(groupId, parseFloat(duration_minutes), startTime)
        const ac = new AbortController()
        runningSimulations.set(run.id, {ac: ac, run: run})
        socket.emit('newSimulation', run)
        runSimulation(run, ac.signal)
    })

    socket.on("getRunningSimulations", () => {
        sendSims()
    })

    const sendSims = () => {
        socket.emit('runningSimulations', Array.from(runningSimulations.entries()).map((x) => x[1].run))
    }

    const runSimulation = async (run: SimulationRun, signal: AbortSignal ) => {
        for (var i = 0; i < run.waitTimes.length; i++) {
            if (run.dataPoints[i] && !signal.aborted) {
                socket.emit('simulationProgress', run.id, run.dataPoints[i])
                //console.log('sending data for: ', run.id)
                await new Promise(r => setTimeout(r, run.waitTimes[i]));
            }
        }
        runningSimulations.delete(run.id)
        socket.emit("endSimulation", run.id)

    }

    socket.on("stopSimulation", (id: string) => {
        console.log('stopping: ', id)
        const x = runningSimulations.get(id)
        console.log(x)
        x.ac.abort()
        runningSimulations.delete(id)
        sendSims()
    })

    const createSimulationRun = async (groupId: string, duration_minutes: number, startTime: number): Promise<SimulationRun> => {
        const group: any = await db.get(`pGroup${groupId}`)
        const positions: MapPoint3D[] = group.predictions[0].points
        const times: Date[] = group.predictions[0].times.map((timestring: string) => new Date(timestring))
        const simulationRunId = uuid()

        // Compute the minimum and maximum dates
        const minDate = Math.min(...times.map(time => time.getTime()));
        const maxDate = Math.max(...times.map(time => time.getTime()));
        const totalTime = maxDate - minDate;

        // Remap each time in the array to a proportional time so that the total time fits within duration_minutes
        const remappedTimes = times.map((time: Date) => {
            const diff = time.getTime() - minDate;
            return minDate + (diff / totalTime) * duration_minutes * 60 * 1000; // duration_minutes converted to milliseconds
        });

        const oldTimes = times.map(t => t.getTime())

        var prevPos = positions[0]

        const packets: DataPoint[] = []
        const waitTimes: number[] = []
        // Iterate through each time, and position (they match up 1 to 1) and emit a message with the current time and position
        for(let i = 0; i < remappedTimes.length; i++) {
            const position = positions[i];
            position.alt = position.alt + Math.random() * 100
            const time = remappedTimes[i];
            const waitTime = i === 0 ? 0 : remappedTimes[i] - remappedTimes[i-1];
            const originalWaitTime = i === 0 ? 0 : oldTimes[i] - oldTimes[i-1];

            const distChange = distance([prevPos.lng, prevPos.lat], [position.lng, position.lat])
            const altChange = position.alt - prevPos.alt
            prevPos = position
            
            const atmosphereParams = standardAtmosphere(position.alt, {si: true})

            //Emit a message with the current time and position
            const packet: DataPoint = {
                id: simulationRunId,
                time: time,
                position: position,
                velocity: altChange/(originalWaitTime/1000),
                hVelocity: distChange/(originalWaitTime/1000000),
                atmosphere: {...atmosphereParams, rh: Math.max(0, 40 - 4 * (position.alt / 1000) + (Math.random()*2))}
            }

            waitTimes.push(waitTime)
            packets.push(packet)
        }

        return {
            dataPoints: packets,
            waitTimes: waitTimes,
            id: simulationRunId,
            startTime: startTime
        }
    }
});
