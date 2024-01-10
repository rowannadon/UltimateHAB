import { Server, Socket } from 'socket.io'
import { Level } from 'level'
import {
    setupPrediction,
} from './predictionProcessor'
import { setupSimulation } from './simulationProcessor'
import { setupSerial } from './serialPort'
import express from 'express'
import path from 'path'

const app = express();
const port = 3001
const io = new Server(port)

export const db = new Level('mydb', { valueEncoding: 'json' })
export var currentSocket: Socket = null

io.on('connect', (socket) => {
    currentSocket = socket
    setupPrediction(socket)
    setupSimulation(socket)
    setupSerial(socket)
})

app.use(express.static(path.join(__dirname, '../public')));

app.listen(2123, () => {
  console.log('Server running on http://localhost:2123/');
});