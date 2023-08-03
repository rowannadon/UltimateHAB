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
            {data && <div>
                <table>
                    <tbody>
                        <tr>
                            <th>Voltage</th>
                            <td>{data?.voltage.toFixed(2)} V</td>
                        </tr>
                        <tr>
                            <th>Time</th>
                            <td>{new Date(data?.oldTime).toString()}</td>
                        </tr>
                        <tr>
                            <th>Altitude</th>
                            <td>{data?.position.alt.toFixed(0)} m</td>
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
                            <td>{data?.atmosphere.rh.toFixed(2)} %</td>
                        </tr>
                        <tr>
                            <th>Pressure</th>
                            <td>{data?.atmosphere.pressure.toFixed(2)} kPa</td>
                        </tr>
                        <tr>
                            <th>Vertical Velocity</th>
                            <td>{data?.velocity.toFixed(2)} m/s</td>
                        </tr>
                        <tr>
                            <th>Horiz. Velocity</th>
                            <td>{data?.hVelocity.toFixed(2)} m/s</td>
                        </tr>
                    </tbody>
                </table>
            </div>}
        </Card>
    )
}
