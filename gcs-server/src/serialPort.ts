import { ReadlineParser, SerialPort } from "serialport";
import { Socket } from 'socket.io'
import { db } from './index'
import { DataPoint, SimulationRun } from "../../modern-gcs/src/StateStore";
import { Transform, TransformOptions } from "stream";
import {vehicles} from './shared';
import fs from 'fs';
import { v4 as uuid } from 'uuid'
import {exec} from 'child_process';
import distance from "@turf/distance";

// class CustomParser extends Transform {
//     private buffer: Buffer = Buffer.alloc(0);
  
//     constructor(options?: TransformOptions) {
//       super(options);
//     }
  
//     _transform(chunk: Buffer, encoding: string, cb: () => void): void {
//       this.buffer = Buffer.concat([this.buffer, chunk]);
  
//       while (this.buffer.length > 0) {
//         if (this.buffer.slice(0, 5).equals(Buffer.from('Data:'))) {
//           // Behave like ReadlineParser for starting characters 'AA'
//           const newlineIndex = this.buffer.indexOf('\n', 5);
//           if (newlineIndex !== -1) {
//             this.push(this.buffer.slice(2, newlineIndex + 5)); // Skip the 'AA'
//             this.buffer = this.buffer.slice(newlineIndex + 5);
//             continue;
//           }
//         } else if (this.buffer.slice(0, 5).equals(Buffer.from('Photo:'))) {
//           // Behave like ByteLength parser for starting characters 'BB'
//           const byteLength = 128; // Set desired byte length
//           if (this.buffer.length >= byteLength + 5) { // Including the 'BB'
//             this.push(this.buffer.slice(2, byteLength + 5)); // Skip the 'BB'
//             this.buffer = this.buffer.slice(byteLength + 5);
//             continue;
//           }
//         } else {
//           // Other parser logic or error handling
//         }
  
//         break; // Exit loop if no conditions met
//       }
  
//       cb();
//     }
//   }

let watchdog: NodeJS.Timeout;
var photo : number[] = [];
var currentSocket: Socket = null;
var latest_photo_name = 'default';

var prevAlt = 0;
var prevPos = {lat: 0, lng: 0};
var prevTime = 0;

var count = 0;

export function setupSerial(socket: Socket) {
    socket.on('getLatestPhoto', () => {
        fs.readFile(`public/${latest_photo_name}.jpg`, (err, buffer) => {
            if (err) {
              console.error(err);
              return;
            }
            console.log('sending latest photo ', latest_photo_name)
            socket.emit('latestPhoto', { image: buffer.toString('base64') });
          });
    })

    count = 0;
    currentSocket = socket;
    const serialport = new SerialPort({ path: '/dev/cu.usbserial-210', baudRate: 115200 })

    serialport.on('error', (err) => {
        console.log('Failed to open serial port:', err);
    });

    const parser = new ReadlineParser( {delimiter: '\n'})
    serialport.on('open', () => {
        console.log('Opened port...')
        serialport.pipe(parser)

        const id = `Serial-${uuid()}`

        var run: SimulationRun = {
            dataPoints: [],
            waitTimes: [],
            id: id,
            startTime: Date.now(),
            multiple: '1',
        }

        vehicles.set(run.id, { ac: null, run: run })

        socket.emit('newSimulation', run);

        // @ts-ignore
        db.put(`simRun${run.id}`, run);

        console.log('Listening for data...')
        
        parser.on('data', (line : string) => {
            processSerialData(line, run)
        })
    })   
}

function resetWatchdog() {
    clearTimeout(watchdog);
    watchdog = setTimeout(triggerFunction, 4000); // 5000 milliseconds = 5 seconds
}

function triggerFunction() {
    console.log("Got photo: ");
    console.log(photo);
    const buffer = Buffer.from(photo);
    fs.writeFileSync('output.bin', buffer);
    var image_name = new Date(Date.now()).toISOString()
    exec(`/Users/rowan/ssdv/ssdv -d -l 128 ./output.bin ./public/${image_name}.jpg`, async (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${error}`);
          return;
        }
        console.log(`stdout: ${stderr}`);
        latest_photo_name = image_name;
        await setTimeout(() => {}, 1000);
        currentSocket.emit('newPhoto');
      });
    photo = [];
}

function processSerialData(line: string, run: SimulationRun) {
    
    console.log(line);
    if (line.startsWith('Data:')) {
        count++;

        const parts = line.slice(5, line.length-1).split(' ')

        const voltage = parseFloat(parts[0])
        const pressure = parseFloat(parts[1])
        const pressureAlt = parseFloat(parts[2])
        const tempIntBmp = parseFloat(parts[3])
        const tempIntDallas = parseFloat(parts[4])
        const tempExtDallas = parseFloat(parts[5])
        const tempExtAht = parseFloat(parts[6])
        const humidity = parseFloat(parts[7])
        const lat = parseFloat(parts[8])
        const lng = parseFloat(parts[9])
        const gpsAlt = parseFloat(parts[10])
        const time = Date.parse(parts[11])


        const distChange = distance(
            [prevPos.lng, prevPos.lat],
            [lng, lat]
        )
        const altChange = gpsAlt - prevAlt
        const timeChange = time - prevTime

        var hVelocity = 0;
        var vVelocity = 0;
        if (timeChange > 0 && Math.abs(altChange) > 0) {
            vVelocity = altChange / (timeChange / 1000)
        }
        if (timeChange > 0 && Math.abs(distChange) > 0) {
            hVelocity = distChange / (timeChange / 1000000)
        }
        const sats = 0;

        

        prevAlt = gpsAlt;
        prevPos.lat = lat;
        prevPos.lng = lng;
        prevTime = time;

        const dataPoint: DataPoint = {
            id: run.id,
            voltage,
            pressure,
            pressureAlt,
            tempIntBmp,
            tempIntDallas,
            tempExtDallas,
            tempExtAht,
            humidity,
            lat,
            lng,
            gpsAlt,
            time: Date.now(),
            hVelocity: hVelocity,
            vVelocity: vVelocity,
            sats: 0,
        }

        if (currentSocket != null) {
            currentSocket.emit(
                'newDataPoint',
                'Serial',
                dataPoint
            )
        }

        // @ts-ignore
        db.put(`dataPoint${run.id}_${count}`, dataPoint)
        
    } else if (line.startsWith('Photo:')) {
        var stringBytes = line.slice(6).split(' ')
        var bytes = stringBytes.map((byte) => parseInt(byte, 16))
        var id = bytes[6]
        const progress = {
            seq: stringBytes[1],
            len: stringBytes[0],
        }
        if (currentSocket != null) {
            console.log('sending photo progress ', progress)
            currentSocket.emit(
                'photoProgress',
                progress
            )
        }

        resetWatchdog();
        photo.push(...bytes.slice(2));

    } else if (line.startsWith('GS')) {
        const parts = line.slice(3, line.length-1).split(' ')
        const groundLat = parts[0]
        const groundLng = parts[1]
        const groundAlt = parts[2]

        if (currentSocket !== null) {
            currentSocket.emit('groundPosition', 
                {
                    lat: parseFloat(groundLat), 
                    lng: parseFloat(groundLng), 
                    alt: parseFloat(groundAlt)
                })
        }
    }
}