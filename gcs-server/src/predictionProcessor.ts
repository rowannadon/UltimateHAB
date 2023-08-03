import {
    PredictionApiRequestResponse,
    Prediction,
    MapPoint3D,
    Segment,
    PredictionGroup,
    PredictionApiRequest,
} from '../../modern-gcs/src/StateStore'
import { ColorConverter, mapRange } from './util2'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
import distance from '@turf/distance'
import { point } from '@turf/turf'
import { Socket } from 'socket.io'
import { db } from './index'
import { find } from 'geo-tz'

export function setupPrediction(socket: Socket) {
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
}

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

export function processPredictions(
    requestResponses: PredictionApiRequestResponse[]
) {
    const predictions: Prediction[] = []
    const c = ColorConverter.randomColor()
    const distances: { distance: number; point: string }[] = []

    for (var reqRes of requestResponses) {
        const request = reqRes.request
        const response = reqRes.response
        const ascent = response.prediction[0].trajectory
        const descent = response.prediction[1].trajectory
        const points: MapPoint3D[] = [...ascent, ...descent].map((point) => {
            return {
                lng: point.longitude - 360,
                lat: point.latitude,
                alt: point.altitude,
            }
        })
        const datetimes: string[] = [...ascent, ...descent].map(
            (point) => point.datetime
        )

        // add final point at ground level
        const lastPoint = points[points.length - 1]
        lastPoint.alt = 0
        points.push(lastPoint)

        // generate line segments
        var segments: Segment[] = []
        for (var i = 0; i < points.length - 1; i++) {
            var segment: Segment = {
                start: points[i],
                end: points[i + 1],
            }
            segments.push(segment)
        }

        // pick which points to display
        const displayedPoints = [
            points[ascent.length], // peak of ascent
            points[0], // start
            points[points.length - 1], // end
        ]

        const result: Prediction = {
            id: uuid(),
            visible: true,
            color: c,
            request: request,
            filteredPoints: displayedPoints,
            points: points,
            segments: segments,
            times: datetimes,
            startPoint: points[0],
            endPoint: points[points.length - 1],
        }

        distances.push({
            point: result.id,
            distance: distance(
                point([points[0].lng, points[0].lat]),
                point([
                    points[points.length - 1].lng,
                    points[points.length - 1].lat,
                ]),
                { units: 'miles' }
            ),
        })

        predictions.push(result)
    }

    var modifiedPredictions: Prediction[] = predictions

    const distanceValues = distances.map((d) => d.distance)
    const minDistance = Math.min(...distanceValues)
    const maxDistance = Math.max(...distanceValues)

    // if there is more than one color, adjust the colors
    if (predictions.length > 1) {
        // remap each distance between -50 and 50
        let map = new Map(
            distances.map((d: { point: string; distance: number }) => [
                d.point,
                mapRange(d.distance, minDistance, maxDistance, -50, 50),
            ])
        )

        // update each color
        modifiedPredictions = predictions.map((pred) => {
            return {
                ...pred,
                color: ColorConverter.adjust(
                    pred.color,
                    map.get(pred.id) as number
                ),
            }
        })
    }

    const result: PredictionGroup = {
        id: uuid(),
        visible: true,
        color: c,
        minDistance: minDistance,
        maxDistance: maxDistance,
        predictions: modifiedPredictions,
    }

    return result
}

export function generateMultiplePredictionRequests(data: any) {
    const ascent_rate = parseFloat(data.ascent_rate)
    const ascent_rate_range = parseFloat(data.ascent_rate_range)
    const descent_rate = parseFloat(data.descent_rate)
    const descent_rate_range = parseFloat(data.descent_rate_range)
    const burst_altitude = parseFloat(data.burst_altitude)
    const burst_altitude_range = parseFloat(data.burst_altitude_range)
    const datetime = Date.parse(data.launch_datetime)
    const datetime_range_hrs = parseInt(data.launch_datetime_range)

    const start_ascent_rate = ascent_rate - 0.5 * ascent_rate_range
    const start_descent_rate = descent_rate - 0.5 * descent_rate_range
    const start_burst_altitude = burst_altitude - 0.5 * burst_altitude_range
    const start_datetime = datetime - 3600000 * 0.5 * datetime_range_hrs

    const end_ascent_rate = ascent_rate + 0.5 * ascent_rate_range
    const end_descent_rate = descent_rate + 0.5 * descent_rate_range
    const end_burst_altitude = burst_altitude + 0.5 * burst_altitude_range
    const end_datetime = datetime + 3600000 * 0.5 * datetime_range_hrs

    const ascent_rate_inc = 1
    const descent_rate_inc = 2
    const burst_altitude_inc = 1000
    const datetime_inc = 3600000 * 1

    const arr: any = []
    for (
        var i = start_ascent_rate;
        i <= end_ascent_rate;
        i += ascent_rate_inc
    ) {
        for (
            var j = start_descent_rate;
            j <= end_descent_rate;
            j += descent_rate_inc
        ) {
            for (
                var k = start_burst_altitude;
                k <= end_burst_altitude;
                k += burst_altitude_inc
            ) {
                for (
                    var t = start_datetime;
                    t <= end_datetime;
                    t += datetime_inc
                ) {
                    const req = {
                        profile: 'standard_profile',
                        launch_latitude: parseFloat(
                            data.launch_latitude
                        ).toFixed(4),
                        launch_longitude: (
                            parseFloat(data.launch_longitude) + 360
                        ).toFixed(4),
                        launch_altitude: parseFloat(data.launch_altitude),
                        launch_datetime: new Date(t).toISOString(),
                        ascent_rate: i.toFixed(4),
                        descent_rate: j.toFixed(4),
                        burst_altitude: k.toFixed(4),
                    }
                    arr.push(req)
                }
            }
        }
    }

    return arr
}

export async function makePredictionApiRequests(
    requests: PredictionApiRequest[],
    updateProgress: (progress: number) => void
) {
    const encodeGetParams = (p: any) =>
        Object.entries(p) //@ts-ignore
            .map((kv) => kv.map(encodeURIComponent).join('='))
            .join('&')

    const responses: PredictionApiRequestResponse[] = []

    for (var i = 0; i < requests.length; i++) {
        var response
        try {
            response = await axios.get(
                'https://api.v2.sondehub.org/tawhiri?' +
                    encodeGetParams(requests[i])
            )
        } catch (err) {
            throw err
        }

        const progress = Math.round((i / requests.length) * 100)
        updateProgress(progress)
        if (response.data.prediction) {
            responses.push({
                request: requests[i],
                response: response.data,
            })
        } else {
            throw new Error('Error ' + response.data)
        }
    }

    return responses
}
