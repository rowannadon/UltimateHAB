import { Server, Socket } from 'socket.io'
import {
    DataPoint,
    MapPoint3D,
    SimulationRun,
} from '../../modern-gcs/src/StateStore'
import { Level } from 'level'
import standardAtmosphere from 'standard-atmosphere'
import {
    setupPrediction,
} from './predictionProcessor'
import { v4 as uuid } from 'uuid'
import distance from '@turf/distance'
import fs from 'fs'
import { setupSimulation } from './simulationProcessor'

const port = 3001
const io = new Server(port)

export const db = new Level('mydb', { valueEncoding: 'json' })
export var currentSocket: Socket = null

io.on('connect', (socket) => {
    currentSocket = socket
    setupPrediction(socket)
    setupSimulation(socket)
})
