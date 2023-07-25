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

export const Flight = (props: any) => {
    const [runningSimulations, setRunningSimulations] = useState<SimulationRun[]>([])

    useEffect(() => {
        if (socket) {
            socket.emit('getRunningSimulations')
        }
    }, [])

    useEffect(() => {
        if (socket) {

            const endSimulation = (id: string) => {
                setRunningSimulations(prev => prev.filter(s => s.id != id))
            }

            const newSimulation = (run: SimulationRun) => {
                setRunningSimulations(prev => [...prev, run])
            }

            const runningSimulations = (runs: SimulationRun[]) => {
                console.log('got sim runs: ', runs)
                setRunningSimulations(runs)
            }

            socket.on('endSimulation', endSimulation)
            socket.on('newSimulation', newSimulation)
            socket.on('runningSimulations', runningSimulations)

            return () => {
                socket.off('endSimulation', endSimulation)
                socket.off('newSimulation', newSimulation)
                socket.off('runningSimulations', runningSimulations)
            }
        }
    }, [socket])

    const RunningSimulation = (props: any) => {
        return (
            <Card className="hover:bg-slate-50 flex min-w-[30px] flex-row justify-between p-2 items-center text-sm pl-4">
                <p>
                    {props.data.id.slice(0, 8)}
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

    return (
        <div className="flex flex-col space-y-2 p-2 bg-slate-100 justify-between flex-grow h-[calc(100vh-2.5rem)]">
            <Card className="flex flex-grow flex-col space-y-2 p-2 overflow-y-auto max-h-[200px]">
                {runningSimulations.map((run: SimulationRun) => (
                    <RunningSimulation
                        data={run}
                        key={run.id}
                        delete={() => {
                            socket.emit('stopSimulation', run.id)
                        }}
                    />
                ))}
            </Card>
            <Card className='p-2 space-y-2'>
                <Card className="w-full aspect-video">

                </Card>
                <div className="flex flex-row items-center">
                    <Progress value={0} className="mr-2" />
                    <Button variant="ghost" className="w-9 p-0 h-9">
                        <Camera className="h-5 w-5" />
                    </Button>
                </div>
            </Card>
        </div>
    )
}
