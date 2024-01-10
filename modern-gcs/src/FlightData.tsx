import { DataPoint } from './StateStore';
import 'chartjs-adapter-date-fns';
import { Card } from './components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { socket } from './socket';

export const FlightData = () => {
    const [data, setData] = useState<DataPoint>({
        id: 'null',
        time: Date.now(),
        voltage: 0,
        gpsAlt: 0,
        lat: 0,
        lng: 0,
        humidity: 0,
        pressure: 0,
        pressureAlt: 0,
        tempExtDallas: 0,
        tempExtAht: 0,
        tempIntDallas: 0,
        tempIntBmp: 0,
        vVelocity: 0,
        hVelocity: 0,
        sats: 0,

    })
    const lastReceivedTime = useRef(Date.now());
    const [timeSinceLastReceived, setTimeSinceLastReceived] = useState(0);

    useEffect(() => {
        if (socket) {
            console.log('adding listeners')

            const intervalId = setInterval(() => {
                if ((Date.now() - lastReceivedTime.current) > 1000) {
                    setTimeSinceLastReceived(Date.now() - lastReceivedTime.current)
                }
                //console.log(timeSinceLastReceived)
            }, 1000);

            const newDataPoint = (id: string, dataPoint: DataPoint) => {
                setTimeSinceLastReceived((Date.now() - lastReceivedTime.current))
                setData(dataPoint)
                lastReceivedTime.current = Date.now()
            }

            socket.on('newDataPoint', newDataPoint)

            return () => {
                clearInterval(intervalId);
                socket.off('newDataPoint', newDataPoint)
            }
        }
    }, [socket])

    return (
        <Card className='flex-shrink p-2'>
            {<div className='flex flex-grow flex-col p-2 text-left text-xs'>
                <div className='w-full'>
                    <table className='w-full'>
                        <tbody className='font-mono'>
                            <tr>
                                <th className='p-0'>Last Received</th>
                                <td className='p-0'>{timeSinceLastReceived > 1000 ? (timeSinceLastReceived / 1000).toFixed(0)+'s' : timeSinceLastReceived.toFixed(0)+'ms'}</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Time</th>
                                <td className='p-0'>{new Date(data?.time).toISOString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className='w-full'>
                    <table className='w-full'>
                        <tbody className='font-mono'>
                            <tr>
                                <th className='p-0'>Voltage</th>
                                <td className='p-0'>{data?.voltage.toFixed(2)}</td>
                                <td className='p-0'>V</td>
                            </tr>
                            {/* <tr>
                                <th className='p-0'>RSSI</th>
                                <td className='p-0'>{data?.RSSI.toFixed(0)}</td>
                                <td className='p-0'>dBm</td>
                            </tr> */}
                            <tr>
                                <th className='p-0'>GPS Altitude</th>
                                <td className='p-0'>{data?.gpsAlt.toFixed(0)}</td>
                                <td className='p-0'>m</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Latitude</th>
                                <td className='p-0'>{data?.lat.toFixed(4)}</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Longitude</th>
                                <td className='p-0'>{data?.lng.toFixed(4)}</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Humidity</th>
                                <td className='p-0'>{data?.humidity.toFixed(2)}</td>
                                <td className='p-0'>%</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Pressure</th>
                                <td className='p-0'>{data?.pressure.toFixed(2)}</td>
                                <td className='p-0'>kPa</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Ext. Temp Dallas</th>
                                <td className='p-0'>{(data?.tempExtDallas).toFixed(2)}</td>
                                <td className='p-0'>°C</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Ext. Temp AHT</th>
                                <td className='p-0'>{(data?.tempExtAht).toFixed(2)}</td>
                                <td className='p-0'>°C</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Int. Temp Dallas</th>
                                <td className='p-0'>{(data?.tempIntDallas).toFixed(2)}</td>
                                <td className='p-0'>°C</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Int. Temp BMP</th>
                                <td className='p-0'>{(data?.tempIntBmp).toFixed(2)}</td>
                                <td className='p-0'>°C</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Vertical Velocity</th>
                                <td className='p-0'>{data?.vVelocity.toFixed(2)}</td>
                                <td className='p-0'>m/s</td>
                            </tr>
                            <tr>
                                <th className='p-0'>Horiz. Velocity</th>
                                <td className='p-0'>{data?.hVelocity.toFixed(2)}</td>
                                <td className='p-0'>m/s</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>}
        </Card>
    )
}
