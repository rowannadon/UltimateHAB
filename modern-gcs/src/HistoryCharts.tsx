import {Chart, registerables } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { DataPoint, SimulationRun } from './StateStore';
import 'chartjs-adapter-date-fns';
import { Card } from './components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { socket } from './socket';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Button } from './components/ui/button';
import { RefreshCcw, Trash } from 'lucide-react';

Chart.register(...registerables);

export const HistoryCharts = () => {
    const [datasets, setDatasets] = useState<SimulationRun[]>([])
    const [currentDataset, setCurrentDataset] = useState<DataPoint[]>()
    const [currentSimulation, setCurrentSimulation] = useState('')

    useEffect(() => {
        if (socket) {
            socket.emit('getAllSimulations')
        }
    }, [])

    useEffect(() => {
        if (currentDataset) {
            const x = currentDataset.map(d => {
                return {
                    x: (d.oldTime - currentDataset[0].oldTime) + Date.now(),
                    y: d.position.alt
                }
            })
            console.log(x)
        }
        
    }, [currentDataset])

    useEffect(() => {
        if (socket) {
            const setSimulations = (simulations: SimulationRun[]) => {
                setDatasets(simulations)
            }

            const setSimulationPoints = (points: DataPoint[]) => {
                points.sort(function(a, b) {
                    return a.oldTime - b.oldTime;
                });
                setCurrentDataset(points)
            }

            socket.on('allSimulations', setSimulations)
            socket.on('simulationPoints', setSimulationPoints)

            return () => {
                socket.off('allSimulations', setSimulations)
                socket.off('simulationPoints', setSimulationPoints)
            }
        }
    }, [socket])

    const onSelect = (id: string) => {
        socket.emit('getSimulationPoints', id)
        setCurrentSimulation(id)
    }

    const commonOptions = {
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                time: {
                    unit: 'second',
                    displayFormats: {
                        second: 'HH:mm'
                    }
                },
                type: 'time'
            },
            y: {
                beginAtZero: true,
            },
        },
        pointStyle: false,
        bezierCurve: false,
    }

    const altitudeOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Altitude (m)',
                },
            },
        },
    }

    const temperatureOptions = {
        ...commonOptions,
        scales: {
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Temperature (°C)',
                },
            },
        },
    }

    const pressureOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Pressure (kPa)',
                },
            },
        },
    }

    const humidityOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Humidity (RH%)',
                },
            },
        },
    }

    const velocityOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'V. Velocity (m/s)',
                },
            },
        },
    }

    const hVelocityOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'H. Velocity (m/s)',
                },
            },
        },
    }

    const voltageOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'Voltage (V)',
                },
            },
        },
    }

    return (
        <ScrollArea className="p-2 space-y-2 overflow-y-auto flex flex-col bg-slate-100 flex-grow max-h-[calc(100vh-2.5rem)]">
            <Card className='flex flex-row p-2 justify-between space-x-2 flex-grow'>
                <Select
                    onValueChange={onSelect}
                    value={currentSimulation}
                >
                    <SelectTrigger >
                        <SelectValue placeholder="Select Preset" />
                    </SelectTrigger>
                    <SelectContent>
                        {datasets.map((dataset) => {
                            return (
                                <SelectItem key={dataset.id} value={dataset.id}>{dataset.id.slice(0, 8)}</SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                <Button variant="outline" className="w-14 h-9 p-0" onClick={() => {
                    if (currentSimulation) {
                        console.log(currentSimulation)
                        socket.emit('deleteSimulation', currentSimulation)
                        setCurrentDataset(undefined)
                        socket.emit('getAllSimulations')
                    }
                }}>
                    <Trash />
                </Button>
                <Button variant='outline' className='w-14 h-9 p-0' onClick={() => {
                    if (socket) {
                        socket.emit('getAllSimulations')
                        socket.emit('getSimulationPoints', currentSimulation)
                    }
                }}>
                    <RefreshCcw className='w-5 h-5' />
                </Button>
            </Card>
            
            {currentDataset && <div className='space-y-2'>
                <Card className='p-2'> 
                    <Line // @ts-ignore
                        options={altitudeOptions} 
                        data={{ 
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0,
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.position.alt
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                    options={temperatureOptions} 
                    data={{
                        datasets: [{
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgb(255, 99, 132)',
                            fill: false,
                            pointRadius: 0,
                            borderWidth: 1,
                            data: currentDataset.map(d => {
                                return {
                                    x: (d.oldTime - currentDataset[0].oldTime),
                                    y: d.atmosphere.temperature - 273.15
                                }
                            })
                        }]
                    }}
                    
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                        options={pressureOptions} 
                        data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.atmosphere.pressure
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                        options={humidityOptions} 
                        data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.atmosphere.rh
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                        options={velocityOptions} 
                        data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.velocity
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                        options={hVelocityOptions} 
                        data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.hVelocity
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
                <Card className='p-2'>
                    <Line // @ts-ignore
                        options={voltageOptions} 
                        data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 1,
                                data: currentDataset.map(d => {
                                    return {
                                        x: (d.oldTime - currentDataset[0].oldTime),
                                        y: d.voltage
                                    }
                                })
                            }]
                        }} 
                    />
                </Card>
            </div>}
        </ScrollArea>
    )
}
