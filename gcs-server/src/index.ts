import { Server, Socket } from 'socket.io'
import {
    DataPoint,
    MapPoint3D,
    PredictionApiRequest,
    PredictionGroup,
    SimulationRun,
} from '../../modern-gcs/src/StateStore'
import { Level } from 'level'
import standardAtmosphere from 'standard-atmosphere'
import { find } from 'geo-tz'
import {
    makePredictionApiRequests,
    generateMultiplePredictionRequests,
    processPredictions,
} from './predictionProcessor'
import { v4 as uuid } from 'uuid'
import distance from '@turf/distance'
import fs from 'fs'
import {parse} from 'csv-parse'

const port = 3001
const io = new Server(port)
const db = new Level('mydb', { valueEncoding: 'json' })

const runningSimulations = new Map<
    String,
    { run: SimulationRun; ac: AbortController }
>()

const batteryInfo: any[] = []

function findClosestValue(pairs: any[], target: number): number {
    let closest = null;
    let diff = Infinity;
  
    for (let pair of pairs) {
      let currentDiff = Math.abs(pair[0] - target);
      if (currentDiff < diff) {
        closest = pair[1];
        diff = currentDiff;
      }
    }
    
    return closest;
  }

var currentSocket: Socket = null

fs.createReadStream("./batterycurve.csv")
  .pipe(parse({ delimiter: ",", from_line: 2 }))
  .on("data", function (row) {
    batteryInfo.push([parseFloat(row[1]), parseFloat(row[0])])
    //console.log([parseFloat(row[1]), parseFloat(row[0])])
})

const addPredictionGroup = (group: PredictionGroup, socket: Socket) => {
    // @ts-ignore - update the DB
    db.put(`pGroup${group.id}`, group)

    // send new prediction to front end
    socket.emit('newPrediction', group)
}

const getPredictions = async () => {
    const items = []
    for await (const [key, value] of db.iterator({ gte: 'pGroup', lte: 'pGroup~'})) {
        items.push(value)
    }
    return items
}

const getSimulations = async () => {
    const items = []
    for await (const [key, value] of db.iterator({ gte: 'simRun', lte: 'simRun~' })) {
        items.push(value)
    }
    return items
}

const getSimulationPoints = async (id: string) => {
    const items: DataPoint[] = []
    for await (const [key, value] of db.iterator({ gte: `simPoint${id}`, lte: `simPoint${id}~`})) {
        // @ts-ignore
        items.push(value)
    }
    return items
}

const runSimulation = async (run: SimulationRun, signal: AbortSignal) => {
    if (currentSocket != null) {
        for (var i = 0; i < run.waitTimes.length; i++) {
            if (run.dataPoints[i] && !signal.aborted) {
                currentSocket.emit(
                    'simulationProgress',
                    run.id,
                    run.dataPoints[i]
                )
                console.log('sending data for: ', run.id, currentSocket.id)
                // @ts-ignore
                db.put(`simPoint${run.id}_${i}`, run.dataPoints[i])
                await new Promise((r) => setTimeout(r, run.waitTimes[i]))
            }
        }
        runningSimulations.delete(run.id)
        currentSocket.emit('endSimulation', run.id)
    }
}

io.on('connect', (socket) => {
    currentSocket = socket
    // request for time zone
    socket.on('getTimeZone', (lat, lon) => {
        socket.emit('timeZone', find(parseFloat(lon), parseFloat(lat)))
    })

    // create a prediction from input form data, store it
    socket.on('makePrediction', (data) => {
        if (
            parseFloat(data.ascent_rate_range) > 0 ||
            parseFloat(data.burst_altitude_range) > 0 ||
            parseFloat(data.descent_rate_range) > 0 ||
            parseFloat(data.launch_datetime_range) > 0
        ) {
            const requests: PredictionApiRequest[] =
                generateMultiplePredictionRequests(data)
            makePredictionApiRequests(requests, (progress) =>
                socket.emit('predictionProgress', progress)
            )
                .then((requestResponses) => {
                    const newGroup: PredictionGroup =
                        processPredictions(requestResponses)
                    addPredictionGroup(newGroup, socket)
                })
                .catch((err) => {
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

            makePredictionApiRequests([request], () => null)
                .then((requestResponses) => {
                    const newGroup: PredictionGroup =
                        processPredictions(requestResponses)
                    addPredictionGroup(newGroup, socket)
                })
                .catch((err) => {
                    console.log(err)
                    // tell front end about the error
                    socket.emit('predictionError', err)
                })
        }
    })

    // send most up to date predictions to front end
    socket.on('getAllPredictions', () => {
        getPredictions().then((items) => {
            console.log('sending items:')
            console.log(items)
            socket.emit('allPredictions', items)
        })
    })

    socket.on('deletePrediction', (id) => {
        console.log('deleting item: ')
        console.log(id)
        db.del(`pGroup${id}`)
    })

    socket.on('startSimulation',
        async (
            groupId: string,
            duration_minutes: string,
            startTime: number
        ) => {
            const run: SimulationRun = await createSimulationRun(
                groupId,
                parseFloat(duration_minutes),
                startTime
            )
            const ac = new AbortController()
            runningSimulations.set(run.id, { ac: ac, run: run })
            socket.emit('newSimulation', run)
            // @ts-ignore
            db.put(`simRun${run.id}`, run)
            runSimulation(run, ac.signal)
        }
    )

    socket.on('getRunningSimulations', () => {
        sendSims()
    })

    socket.on('getAllSimulations', async () => {
        getSimulations().then((items) => {
            console.log('sending simulations from db:')
            console.log(items)
            socket.emit('allSimulations', items)
        })
    })

    socket.on('getSimulationPoints', async (id: string) => {
        getSimulationPoints(id).then((items) => {
            console.log('sending simulation points from db:')
            console.log(items)
            socket.emit('simulationPoints', items)
        })
    })

    socket.on('deleteSimulation', async (id: string) => {
        getSimulationPoints(id).then(async (items) => {
            
            const keys: string[] = []
            for await (const [key, value] of db.iterator({ gte: `simPoint${id}`, lte: `simPoint${id}~`})) {
                // @ts-ignore
                items.push(key)
            }
            for (var key of keys) {
                db.del(key)
                console.log('deleting', key)
            }
            
        })
        db.del(`simRun${id}`)
    })

    const sendSims = () => {
        socket.emit(
            'runningSimulations',
            Array.from(runningSimulations.entries()).map((x) => x[1].run)
        )
    }

    socket.on('stopSimulation', (id: string) => {
        console.log('stopping: ', id)
        const x = runningSimulations.get(id)
        if (x) { x.ac.abort() }
        
        runningSimulations.delete(id)
        sendSims()
    })

    function interpolateGeoPoints(
        pointA: MapPoint3D,
        pointB: MapPoint3D,
        numPoints: number,
        startTime: number,
        endTime: number,
        oldStartTime: number,
        oldEndTime: number
    ) {
        if (numPoints < 2) throw 'numPoints must be at least 2.'

        const latDiff = pointB.lat - pointA.lat
        const lonDiff = pointB.lng - pointA.lng
        const altDiff = pointB.alt - pointA.alt
        const timeDiff = endTime - startTime
        const oldTimeDiff = oldEndTime - oldStartTime

        const latStep = latDiff / (numPoints - 1)
        const lonStep = lonDiff / (numPoints - 1)
        const altStep = altDiff / (numPoints - 1)
        const timeStep = timeDiff / (numPoints - 1)
        const oldTimeStep = oldTimeDiff / (numPoints - 1)

        const interpolatedPoints = []

        for (let i = 1; i < numPoints; i++) {
            const lat = pointA.lat + i * latStep
            const lon = pointA.lng + i * lonStep
            const alt = pointA.alt + i * altStep
            const tim = startTime + i * timeStep
            const oldTim = oldStartTime + i * oldTimeStep

            interpolatedPoints.push({
                pos: { lat: lat, lng: lon, alt: alt },
                time: tim,
                oldTime: oldTim
            })
        }

        return interpolatedPoints
    }

    const createSimulationRun = async (
        groupId: string,
        duration_minutes: number,
        startTime: number
    ): Promise<SimulationRun> => {
        const group: any = await db.get(`pGroup${groupId}`)
        const positions: MapPoint3D[] = group.predictions[0].points.slice(0, -1)
        const times: Date[] = group.predictions[0].times.map(
            (timestring: string) => new Date(timestring)
        ).slice(0, -1)
        const simulationRunId = uuid()

        // Compute the minimum and maximum dates
        const minDate = Math.min(...times.map((time) => time.getTime()))
        const maxDate = Math.max(...times.map((time) => time.getTime()))
        const totalTime = maxDate - minDate

        // Remap each time in the array to a proportional time so that the total time fits within duration_minutes
        const remappedTimes = times.map((time: Date) => {
            const diff = time.getTime() - minDate
            return minDate + (diff / totalTime) * duration_minutes * 60 * 1000 // duration_minutes converted to milliseconds
        })

        const mult = (totalTime / (duration_minutes * 60 * 1000)).toFixed(1)

        // calculate time diff between first two points
        const timeDiff = remappedTimes[1] - remappedTimes[0]
        const numInterpolations = Math.floor(timeDiff / 250)
        var newPositions = positions
        var newTimes = remappedTimes
        var oldTimes = times.map((t) => t.getTime())
        console.log(positions.length)
        
        if (numInterpolations > 2) {
            newPositions = []
            newTimes = []
            oldTimes = []
            for (var i = 0; i < positions.length - 2; i++) {
                console.log('interpolation', i)
                var interps = interpolateGeoPoints(
                    positions[i],
                    positions[i + 1],
                    numInterpolations,
                    remappedTimes[i],
                    remappedTimes[i + 1],
                    times[i].getTime(),
                    times[i + 1].getTime()
                )
                for (var p of interps) {
                    newPositions.push(p.pos)
                    newTimes.push(p.time)
                    oldTimes.push(p.oldTime)
                }
            }
        }

        var prevPos = positions[0]

        const packets: DataPoint[] = []
        const waitTimes: number[] = []

        const originalCapacity = 1000
        var capacityLeft = originalCapacity

        var velocityBuffer = []
        var hVelocityBuffer = []
        
        for (let i = 0; i < newTimes.length; i++) {
            const position = newPositions[i]
            position.alt = position.alt + Math.random()*1
            position.lat = position.lat + Math.random() * 0.001
            position.lng= position.lng + Math.random() * 0.001
            const time = newTimes[i]
            const oldTime = oldTimes[i]
            const waitTime = i === 0 ? 0 : newTimes[i] - newTimes[i - 1]
            const originalWaitTime = i === 0 ? 0 : oldTimes[i] - oldTimes[i-1];

            capacityLeft -= (originalWaitTime/10000)
            const voltage = findClosestValue(batteryInfo, (originalCapacity-capacityLeft)/500)
            console.log(capacityLeft, voltage)

            const distChange = distance(
                [prevPos.lng, prevPos.lat],
                [position.lng, position.lat]
            )
            const altChange = position.alt - prevPos.alt
            prevPos = position

            const atmosphereParams = standardAtmosphere(position.alt, {
                si: true,
            })

            var velocity = 0
            var hVelocity = 0
            if (originalWaitTime > 0 && Math.abs(altChange) > 0) {
                velocity = altChange / (originalWaitTime / 1000)
            }
            if (originalWaitTime > 0 && Math.abs(distChange) > 0) {
                hVelocity = distChange / (originalWaitTime / 1000000)
            }

            hVelocityBuffer.push(hVelocity)
            if (velocityBuffer.length > 3) {
                velocityBuffer.shift()
            }

            velocityBuffer.push(velocity)
            if (velocityBuffer.length > 3) {
                velocityBuffer.shift()
            }

            const packet: DataPoint = {
                id: simulationRunId,
                time: time,
                oldTime: oldTime,
                position: position,
                velocity: velocityBuffer.reduce((partialSum, a) => partialSum + a, 0)/velocityBuffer.length,
                hVelocity: hVelocityBuffer.reduce((partialSum, a) => partialSum + a, 0)/hVelocityBuffer.length,
                voltage: voltage,
                atmosphere: {
                    ...atmosphereParams,
                    rh: atmosphereParams.pressure/3000 + Math.random() * 4,
                },
            }

            waitTimes.push(waitTime)
            packets.push(packet)
        }

        return {
            dataPoints: packets,
            waitTimes: waitTimes,
            id: simulationRunId,
            startTime: startTime,
            multiple: mult
        }
    }
})
