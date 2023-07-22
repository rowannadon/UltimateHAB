import { useEffect, useState } from 'react'
import { Button } from './components/ui/button'
import { Loader2, Play } from 'lucide-react'
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

export const SimulationFormSchema = z.object({
    minutes: z.string().refine((val) => !Number.isNaN(parseFloat(val))),
})

export function SimulationForm(props: any) {

    const form = useForm<z.infer<typeof SimulationFormSchema>>({
        resolver: zodResolver(SimulationFormSchema),
        defaultValues: {
            minutes: '',
        },
    })

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(props.onSubmit)}
                className="p-3 w-full h-full"
            >
                <div className="flex flex-row justify-stretch w-full items-center justify-items-baseline space-x-3">
                    <FormField
                        control={form.control}
                        
                        name="minutes"
                        render={({ field }) => (
                            <FormItem className="w-[120px]">
                                <FormControl>
                                    <Input placeholder="Duration (min)" {...field} />
                                    
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button variant="outline" type="submit" disabled={props.loading} className='w-9 h-9 p-0'>
                        {props.loading && (
                            <Loader2 className="animate-spin" />
                        )}
                        {!props.loading && <Play className='w-5 h-5' />}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
