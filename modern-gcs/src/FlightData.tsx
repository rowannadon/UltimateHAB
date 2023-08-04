import { DataPoint } from './StateStore';
import 'chartjs-adapter-date-fns';
import { Card } from './components/ui/card';
import { useEffect, useState } from 'react';
import { socket } from './socket';

export const FlightData = () => {
    const [data, setData] = useState<DataPoint>()

    useEffect(() => {
        if (socket) {
            console.log('adding listeners')

            const simulationProgress = (id: string, dataPoint: DataPoint) => {
                setData(dataPoint)
            }

            console.log(socket.on('simulationProgress', simulationProgress))

            return () => {
                socket.off('simulationProgress', simulationProgress)
            }
        }
    }, [socket])

    return (
        <Card className='flex-grow'>
            {data && <div className='flex flex-grow flex-col'>
                <table>
                    <tbody>
                        <tr>
                            <th>Time</th>
                            <td>{new Date(data?.oldTime).toISOString()}</td>
                        </tr>
                    </tbody>
                </table>
                <table>
                    <tbody>
                        <tr>
                            <th>Voltage</th>
                            <td>{data?.voltage.toFixed(2)}</td>
                            <td>V</td>
                        </tr>
                        <tr>
                            <th>RSSI</th>
                            <td>{data?.RSSI.toFixed(0)}</td>
                            <td>dBm</td>
                        </tr>
                        <tr>
                            <th>Altitude</th>
                            <td>{data?.position.alt.toFixed(0)}</td>
                            <td>m</td>
                        </tr>
                        <tr>
                            <th>Latitude</th>
                            <td>{data?.position.lat.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <th>Longitude</th>
                            <td>{data?.position.lng.toFixed(4)}</td>
                        </tr>
                        <tr>
                            <th>Humidity</th>
                            <td>{data?.atmosphere.rh.toFixed(2)}</td>
                            <td>%</td>
                        </tr>
                        <tr>
                            <th>Pressure</th>
                            <td>{data?.atmosphere.pressure.toFixed(2)}</td>
                            <td>kPa</td>
                        </tr>
                        <tr>
                            <th>Ext. Temp</th>
                            <td>{(data?.atmosphere.temperature - 273.15).toFixed(2)}</td>
                            <td>°C</td>
                        </tr>
                        <tr>
                            <th>Int. Temp</th>
                            <td>{(data?.internalTemp - 273.15).toFixed(2)}</td>
                            <td>°C</td>
                        </tr>
                        <tr>
                            <th>Vertical Velocity</th>
                            <td>{data?.velocity.toFixed(2)}</td>
                            <td>m/s</td>
                        </tr>
                        <tr>
                            <th>Horiz. Velocity</th>
                            <td>{data?.hVelocity.toFixed(2)}</td>
                            <td>m/s</td>
                        </tr>
                    </tbody>
                </table>
            </div>}
        </Card>
    )
}
