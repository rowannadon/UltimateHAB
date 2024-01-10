import { useEffect, useState } from 'react'
// @ts-ignore
import dataCsv from './assets/data.csv'
import { Card } from '@/components/ui/card'
import { Button } from './components/ui/button'
import {
    Camera,
    Trash,
} from 'lucide-react'
import { SimulationRun} from './StateStore'
import { Progress } from './components/ui/progress'
import { socket } from './socket'
import { FlightData } from './FlightData'

export const Flight = (props: any) => {
    const [vehicles, setVehicles] = useState<SimulationRun[]>([])

    const [image, setImage] = useState<string|undefined>(undefined)
    const [photoProgress, setPhotoProgress] = useState<number>(0)

    useEffect(() => {
        if (socket) {
            socket.emit('getVehicles')
        }
    }, [])

    useEffect(() => {
        if (socket) {

            const endSimulation = (id: string) => {
                setVehicles(prev => prev.filter(s => s.id != id))
            }

            const newSimulation = (run: SimulationRun) => {
                setVehicles(prev => [...prev, run])
            }

            const vehicles = (runs: SimulationRun[]) => {
                console.log('got vehicles: ', runs)
                setVehicles(runs)
            }

            const onNewPhoto = () => {
                socket.emit('getLatestPhoto');
                setPhotoProgress(0);
            }

            const onLatestPhoto = (data: any) => {
                setImage(`data:image/jpeg;base64,${data.image}`);
            }

            const onPhotoProgress = (prog : any) => {
                setPhotoProgress(Math.round((parseInt(prog.seq) / parseInt(prog.len)) * 100))
            }

            socket.on('endSimulation', endSimulation)
            socket.on('newSimulation', newSimulation)
            socket.on('vehicles', vehicles)
          
            socket.on('newPhoto', onNewPhoto)
            socket.on('latestPhoto', onLatestPhoto)
            socket.on('photoProgress', onPhotoProgress)

            if (image === undefined) {
                socket.emit('getLatestPhoto');
            }

            return () => {
                socket.off('endSimulation', endSimulation)
                socket.off('newSimulation', newSimulation)
                socket.off('vehicles', vehicles)

                socket.off('newPhoto', onNewPhoto)
                socket.off('latestPhoto', onLatestPhoto)
                socket.off('photoProgress', onPhotoProgress)
            }
        }
    }, [socket])

    const ConnectedVehicle = (props: any) => {
        return (
            <Card className="hover:bg-slate-50 flex min-w-[30px] flex-row justify-between p-2 items-center text-sm pl-4">
                <p>
                    {props.data.id.slice(0, 8)}
                </p>
                <p>
                    {props.data.multiple}x
                </p>
                <div className="flex flex-row space-x-2">
                    <Button
                        variant="outline"
                        className="w-9 p-0 h-9"
                        onClick={props.delete}
                    >
                        <Trash className="h-5 w-5" />
                    </Button>
                </div>
            </Card>
        )
    }

    const Image = () => {
        return (
          <div className='w-full h-full flex flex-col justify-center space-y-2'>
            <div className='flex flex-row justify-center'>
                <img className='h-[256px] aspect-auto' src={image} alt="Live Image" style={{ imageRendering: 'pixelated' }} />
            </div>
            <Progress value={photoProgress} className="mr-2" />
          </div>
        );
      };

    return (
        <div className="flex flex-col space-y-2 p-2 bg-slate-100 justify-between flex-grow h-[calc(100vh-2.5rem)]">
            <Card className="flex flex-grow flex-col space-y-2 p-2 overflow-y-auto max-h-[200px]">
                {vehicles.length === 0 && <p className="text-center text-gray-500">Not connected...</p>}
                {vehicles.map((run: SimulationRun) => (
                    <ConnectedVehicle
                        data={run}
                        key={run.id}
                        delete={() => {
                            socket.emit('stopSimulation', run.id)
                        }}
                    />
                ))}
            </Card>

            <FlightData />

            <Card className='flex flex-col p-2 space-y-2'>
                <Image />
            </Card>
        </div>
    )
}
