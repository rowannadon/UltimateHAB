import {Chart, registerables } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { DataPoint, SimulationRun } from './StateStore';
import 'chartjs-adapter-date-fns';
import ChartStreaming from 'chartjs-plugin-streaming';
import { Card } from './components/ui/card';
import { useEffect, useRef } from 'react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { socket } from './socket';

Chart.register(...registerables);
Chart.register(ChartStreaming);

export const DataCharts = () => {
    const prevAlt = useRef(0)
    const prevTemp = useRef(0)
    const prevPres = useRef(0)
    const prevHum = useRef(0)
    const prevVel = useRef(0)
    const prevHvel = useRef(0)
    const prevVol = useRef(0)

    const date = useRef(0)
    const dataRef = useRef<DataPoint[]>([])

    useEffect(() => {
        date.current = Date.now()
        dataRef.current = []
    })

    useEffect(() => {
        date.current = Date.now() + 1000
    }, [dataRef.current])

    useEffect(() => {
        if (socket) {
            console.log('adding listeners')
            const newSimulation = (run: SimulationRun) => {
                date.current = run.startTime
                dataRef.current = []
            }

            const simulationProgress = (id: string, dataPoint: DataPoint) => {
                dataRef.current.push(dataPoint)
                console.log('receiving packet')
            }

            socket.on('newSimulation', newSimulation)
            console.log(socket.on('simulationProgress', simulationProgress))

            return () => {
                socket.off('newSimulation', newSimulation)
                socket.off('simulationProgress', simulationProgress)
            }
        }
    }, [socket])

    const commonOptions = {
        responsive: true,
        type: 'line',
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                display: false,
                type: 'realtime',  // Change this
                realtime: {    // Add this for streaming data
                    duration: 10000,
                    refresh: 100,
                    delay: 500,
                    ttl: 11000,
                    framerate: 30,
                },
                time: {
                    unit: 'millisecond',
                },
            },
            y: {
                //beginAtZero: true,
            },
        },
        pointStyle: false
    }

    const altitudeOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].position.alt,
                                }
                                
                                if (prevHum.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevHum.current = obj.x
                            });
                        }
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current?.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any, i: number) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: i === 0 ? dataRef.current[dataRef.current.length-1].atmosphere.temperature - 273.15 : dataRef.current[dataRef.current.length-1].internalTemp - 273.15,
                                }
                                
                                if (prevTemp.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevTemp.current = obj.x
                            })
                        };
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].atmosphere.pressure,
                                }
                                
                                if (prevPres.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevPres.current = obj.x
                            })
                        };
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].atmosphere.rh,
                                }
                                
                                if (prevAlt.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevAlt.current = obj.x
                            });
                        }
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].velocity,
                                }
                                
                                if (prevVel.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevVel.current = obj.x
                            });
                        }
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].hVelocity,
                                }
                                
                                if (prevHvel.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevHvel.current = obj.x
                            });
                        }
                    },
                }
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
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].voltage,
                                }
                                
                                if (prevVol.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevVol.current = obj.x
                            });
                        }
                    },
                }
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

    const rssiOptions = {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            x: {
                ...commonOptions.scales.x,
                realtime: {
                    ...commonOptions.scales.x.realtime,
                    onRefresh: function(chart: any) {
                        if (dataRef.current.length > 1) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (dataRef.current[dataRef.current.length-1].time - dataRef.current[0].time)
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current[dataRef.current.length-1].RSSI,
                                }
                                
                                if (prevVol.current !== obj.x) {
                                    dataset.data.push(obj)
                                }
        
                                prevVol.current = obj.x
                            });
                        }
                    },
                }
            },
            y: {
                ...commonOptions.scales.y,
                title: {
                    display: true,
                    text: 'RSSI (dBm)',
                },
            },
        },
    }

    return (
        <ScrollArea className="space-y-2 p-2 overflow-y-auto flex flex-col bg-slate-100 flex-grow max-h-[calc(100vh-2.5rem)]">
            <Card className='p-2'> 
                <Line // @ts-ignore
                    options={altitudeOptions} 
                    data={{ 
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 2,
                                data: []
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
                            borderWidth: 2,
                            data: []
                        },
                        {
                            backgroundColor: 'rgba(132, 99, 255, 0.5)',
                            borderColor: 'rgb(132, 99, 255)',
                            fill: false,
                            pointRadius: 0, 
                            borderWidth: 2,
                            data: []
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
                                borderWidth: 2,
                                data: []
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
                                borderWidth: 2,
                                data: []
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
                                borderWidth: 2,
                                data: []
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
                                borderWidth: 2,
                                data: []
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
                                borderWidth: 2,
                                data: []
                            }]
                        }} 
                />
            </Card>
            <Card className='p-2'>
                <Line // @ts-ignore
                    options={rssiOptions} 
                    data={{
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
                                fill: false,
                                pointRadius: 0, 
                                borderWidth: 2,
                                data: []
                            }]
                        }} 
                />
            </Card>
        </ScrollArea>
    )
}
