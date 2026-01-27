"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ICustomDatePickerProps {
    title: string,
    name: string,
    defaultValue?: string | null,
    dateFormat?: 'dd-MM-yyyy' | 'yyyy-MM-dd',
    onChange?: (name: string, value: string | null) => void
}
export default function CustomDatePicker({
    title,
    dateFormat = 'dd-MM-yyyy',
    name,
    defaultValue,
    onChange
}: ICustomDatePickerProps) {
    const [date, setDate] = React.useState<Date | undefined>(
        defaultValue ? new Date(defaultValue) : undefined
    )

    const handleSelect = (selected?: Date) => {
        setDate(selected)
        if(selected && onChange){
            onChange(name, format(selected, dateFormat))
        }else if(onChange){
            onChange(name, null)
        }
    }

  return (
    <Popover>
      <PopoverTrigger className="" asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className="data-[empty=true]:text-muted-foreground justify-start text-left font-normal w-full"
        >
          <CalendarIcon />
          {date ? format(date, dateFormat) : <span>{title}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={handleSelect} captionLayout="dropdown"  />
      </PopoverContent>
    </Popover>
  )
}