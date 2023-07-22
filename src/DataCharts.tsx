import {Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, registerables, ElementChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { faker } from '@faker-js/faker'
import { DataPoint, DataStoreState, useDataStore } from './StateStore';
import 'chartjs-adapter-date-fns';
import StreamingPlugin from 'chartjs-plugin-streaming';
import { Card } from './components/ui/card';
import { useEffect, useRef } from 'react';

Chart.register(...registerables);
Chart.register(StreamingPlugin);

export const DataCharts = () => {
    const prevAlt = useRef(0)
    const prevTemp = useRef(0)
    const prevPres = useRef(0)
    const date = useRef(Date.now())

    const dataRef = useRef<DataPoint[]>(useDataStore.getState().data)
    // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
    useEffect(() => useDataStore.subscribe(
        state => (dataRef.current = state.data)
    ), [])

    const commonOptions = {
        responsive: true,
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
                    duration: 20000,
                    refresh: 200,
                    delay: 0,
                },
                time: {
                    unit: 'millisecond',
                },
            },
            y: {
                beginAtZero: true,
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
                        if (dataRef.current.length > 0) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (new Date(dataRef.current.slice(-1)[0].time).getTime() - new Date(dataRef.current.slice(1)[0].time).getTime())
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current.slice(-1)[0].position.alt,
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
                        if (dataRef.current.length > 0) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (new Date(dataRef.current.slice(-1)[0].time).getTime() - new Date(dataRef.current.slice(1)[0].time).getTime())
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current.slice(-1)[0].atmosphere.temperature - 273.15,
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
                        if (dataRef.current.length > 0) {
                            chart.data.datasets.forEach(function(dataset: any) {
                                const timeDiff = (new Date(dataRef.current.slice(-1)[0].time).getTime() - new Date(dataRef.current.slice(1)[0].time).getTime())
                                const obj = {
                                    x: date.current + timeDiff,
                                    y: dataRef.current.slice(-1)[0].atmosphere.pressure,
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

    return (
        <div className="bg-background space-y-4 h-full p-4 overflow-y-auto min-w-[300px]">
            <Card className='p-2'> 
                <Line // @ts-ignore
                    options={altitudeOptions} 
                    data={{ 
                            datasets: [{
                                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                                borderColor: 'rgb(255, 99, 132)',
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
                                data: []
                            }]
                        }} 
                />
            </Card>
        </div>
    )
}
