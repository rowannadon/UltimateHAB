import { useEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Loader2, MapPin } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { DateTimePicker } from '@/components/ui/date-time-picker/date-time-picker'
import { useMarkerStore } from './StateStore'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { socket } from './socket'
import {PredictorFormSchema} from './StateStore'

import {CalendarDateTime} from '@internationalized/date'

export function DatePicker() {
    const [date, setDate] = useState<Date>()

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={'outline'}
                    className={cn(
                        'w-[280px] justify-start text-left font-normal',
                        !date && 'text-muted-foreground',
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

export function InputForm(props: any) {
    const markerPosition = useMarkerStore((state: any) => state.markerPosition)
    const isMulti = props.type === 'multi'
    const [selectedDate, setSelectedDate] = useState<CalendarDateTime>()
    const [timeZone, setTimeZone] = useState('America/Denver')

    const [presets, setPresets] = useState([
        JSON.stringify({
            ascent_rate: '5',
            ascent_rate_range: '0',
            burst_altitude: '30000',
            burst_altitude_range: '0',
            descent_rate: '12',
            descent_rate_range: '0',
            launch_altitude: '0',
            launch_datetime: '2023-07-22T14:00:00.000Z',
            launch_datetime_range: '0',
            launch_latitude: '35.1525',
            launch_longitude: '-105.7546',
            time_zone: 'America/Denver',
        }),
    ])

    const form = useForm<z.infer<typeof PredictorFormSchema>>({
        resolver: zodResolver(PredictorFormSchema),
        defaultValues: {
            burst_altitude_range: isMulti ? '' : '0',
            ascent_rate_range: isMulti ? '' : '0',
            descent_rate_range: isMulti ? '' : '0',
            launch_datetime_range: isMulti ? '' : '0',
            launch_latitude: parseFloat(markerPosition[1]).toFixed(4),
            launch_longitude: parseFloat(markerPosition[0]).toFixed(4),
            ascent_rate: '',
            descent_rate: '',
            burst_altitude: '',
            launch_altitude: '',
            launch_datetime: '',
        },
    })

    useEffect(() => {
        const markerPosSub = useMarkerStore.subscribe((state: any) => {
            form.setValue(
                'launch_latitude',
                parseFloat(state.markerPosition[1]).toFixed(4),
            )
            form.setValue(
                'launch_longitude',
                parseFloat(state.markerPosition[0]).toFixed(4),
            )

            socket.emit('getTimeZone', parseFloat(form.getValues().launch_longitude), parseFloat(form.getValues().launch_latitude))
        })

        return markerPosSub
    }, [])

    useEffect(() => {
        if (socket) {
            socket.on('timeZone', (zones) => {
                if (zones.length > 0) {
                    console.log('setting time zone: ', zones[0])
                    setTimeZone(zones[0])
                }
            })
        }
    }, [socket])

    useEffect(() => {
        if (selectedDate) {
            console.log(selectedDate)
            form.setValue('launch_datetime', selectedDate.toDate(timeZone).toISOString())
        }
    }, [selectedDate])

    useEffect(() => {
        console.log(presets)
    }, [presets])

    useEffect(() => {
        console.log('time zone is now: ', timeZone)
    }, [timeZone])

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(props.onSubmit)}
                className="space-y-3 p-2 w-full h-full"
            >
                <Select
                    onValueChange={(v) => {
                        const val = JSON.parse(v)
                        Object.keys(val).forEach((v: any) => {
                            if (v === 'time_zone') {
                                setTimeZone(val[v])
                            } else {
                                form.setValue(v, val[v])
                            }
                        })
                        const date = new Date(val['launch_datetime'])
                        console.log(
                            date.getFullYear(),
                            date.getMonth() + 1, 
                            date.getDate(), 
                            date.getHours()+1
                        )
                        setSelectedDate(
                            new CalendarDateTime(
                                date.getFullYear(),
                                date.getMonth() + 1, 
                                date.getDate(), 
                                date.getHours()+1
                            )
                        )
                    }}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Preset" />
                    </SelectTrigger>
                    <SelectContent>
                        {presets.map((preset) => {
                            const vals = JSON.parse(preset)
                            // @ts-ignore
                            const name = `[${vals.launch_latitude}, ${vals.launch_longitude}, ${vals.launch_altitude}] - ${vals.launch_datetime}`
                            return (
                                // @ts-ignore
                                <SelectItem key={name} value={preset}>{name}</SelectItem>
                            )
                        })}
                    </SelectContent>
                </Select>
                <div className="flex flex-row justify-stretch space-x-2 w-full">
                    <FormField
                        control={form.control}
                        name="launch_latitude"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Input placeholder="Latitude" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="launch_longitude"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Input placeholder="Longitude" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        variant="ghost"
                        className="w-20 h-9 p-0"
                        onClick={(e) => {
                            e.preventDefault()
                            form.setValue(
                                'launch_latitude',
                                parseFloat(markerPosition[1]).toFixed(4),
                            )
                            form.setValue(
                                'launch_longitude',
                                parseFloat(markerPosition[0]).toFixed(4),
                            )
                        }}
                    >
                        <MapPin className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex flex-row space-x-2 items-center">
                    <FormField
                        control={form.control}
                        name="launch_datetime"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <DateTimePicker
                                        granularity={'hour'}
                                        aria-label="Launch Date and Time"
                                        value={selectedDate}
                                        onChange={(date) => {                    
                                            setSelectedDate(date as CalendarDateTime)
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {isMulti && <p>±</p>}
                    {isMulti && (
                        <FormField
                            control={form.control}
                            name="launch_datetime_range"
                            render={({ field }) => (
                                <FormItem className="w-[100px]">
                                    <FormControl>
                                        <Input
                                            placeholder="0 hours"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                <div className="flex flex-row justify-evenly space-x-2">
                    <div className="flex flex-row space-x-2 items-center flex-grow">
                        <FormField
                            control={form.control}
                            name="ascent_rate"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input
                                            placeholder="Ascent Rate (m/s)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isMulti && <p>±</p>}
                        {isMulti && (
                            <FormField
                                control={form.control}
                                name="ascent_rate_range"
                                render={({ field }) => (
                                    <FormItem className="w-[50px]">
                                        <FormControl>
                                            <Input placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                    <div className="flex flex-row space-x-2 items-center flex-grow">
                        <FormField
                            control={form.control}
                            name="descent_rate"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input
                                            placeholder="Descent Rate (m/s)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isMulti && <p>±</p>}
                        {isMulti && (
                            <FormField
                                control={form.control}
                                name="descent_rate_range"
                                render={({ field }) => (
                                    <FormItem className="w-[50px]">
                                        <FormControl>
                                            <Input placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>
                <div className="flex flex-row justify-evenly space-x-2">
                    <FormField
                        control={form.control}
                        name="launch_altitude"
                        render={({ field }) => (
                            <FormItem className="basis-1/2">
                                <FormControl>
                                    <Input
                                        placeholder="Launch Altitude (m)"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="flex flex-row space-x-2 items-center basis-1/2">
                        <FormField
                            control={form.control}
                            name="burst_altitude"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input
                                            placeholder="Burst Altitude (m)"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isMulti && <p>±</p>}
                        {isMulti && (
                            <FormField
                                control={form.control}
                                name="burst_altitude_range"
                                render={({ field }) => (
                                    <FormItem className="w-[100px]">
                                        <FormControl>
                                            <Input placeholder="0" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                </div>
                <div className="flex w-full justify-between">
                    <Button
                        variant="outline"
                        disabled={props.loading}
                        onClick={(e) => {
                            e.preventDefault() // @ts-ignore
                            setPresets((prev: any) => [
                                ...prev,
                                JSON.stringify(form.getValues()),
                            ])
                        }}
                    >
                        {/* {props.loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )} */}
                        Save Parameters
                    </Button>
                    <Button variant="default" type="submit" disabled={props.loading}>
                        {props.loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Submit New Prediction
                    </Button>
                </div>
            </form>
        </Form>
    )
}
