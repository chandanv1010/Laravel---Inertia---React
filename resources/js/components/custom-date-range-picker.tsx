"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ICustomDateRangePickerProps {
    title: string,
    name: string,
    defaultValue?: { from?: string; to?: string } | null,
    onChange?: (name: string, value: { from?: string; to?: string } | null) => void,
    onStateChange?: (value: { from?: string; to?: string } | null) => void, // Chỉ update state, không submit
    dateFormat?: 'dd-MM-yyyy' | 'yyyy-MM-dd',
    className?: string
}

export default function CustomDateRangePicker({
    title,
    dateFormat = 'yyyy-MM-dd',
    name,
    defaultValue,
    onChange,
    onStateChange,
    className
}: ICustomDateRangePickerProps) {
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
        defaultValue && defaultValue.from && defaultValue.to ? {
            from: new Date(defaultValue.from),
            to: new Date(defaultValue.to),
        } : undefined
    )
    const [open, setOpen] = React.useState(false)

    const handleSelect = (range: DateRange | undefined) => {
        setDateRange(range)
        
        // Nếu có onStateChange (chỉ update state, không submit), dùng nó
        if (onStateChange) {
            if (range && range.from && range.to) {
                // Đã chọn đủ 2 ngày, update state và đóng popover
                const value = {
                    from: format(range.from, dateFormat),
                    to: format(range.to, dateFormat),
                }
                onStateChange(value)
                // Đóng popover sau khi đã chọn đủ 2 ngày
                setOpen(false)
            } else if (range && range.from && !range.to) {
                // Chỉ mới chọn ngày đầu tiên, update state nhưng giữ popover mở
                const value = {
                    from: format(range.from, dateFormat),
                    to: undefined,
                }
                onStateChange(value)
                // KHÔNG đóng popover, đợi chọn ngày thứ 2
            } else if (!range) {
                // Clear date range
                onStateChange(null)
            }
            return
        }
        
        // Nếu không có onStateChange, dùng onChange (behavior cũ)
        if (range && onChange) {
            // Chỉ trigger khi đã có cả from và to
            if (range.from && range.to) {
                const value = {
                    from: format(range.from, dateFormat),
                    to: format(range.to, dateFormat),
                }
                onChange(name, value)
                // Đóng popover sau khi đã chọn đủ 2 ngày
                setOpen(false)
            }
            // Nếu chỉ mới chọn from, chưa trigger onChange (đợi chọn to) - giữ popover mở
        } else if (onChange && !range) {
            // Clear date range
            onChange(name, null)
        }
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setDateRange(undefined)
        if (onStateChange) {
            onStateChange(null)
        } else if (onChange) {
            onChange(name, null)
        }
        setOpen(false)
    }

    const displayText = dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, 'dd-MM-yyyy')} - ${format(dateRange.to, 'dd-MM-yyyy')}`
        : dateRange?.from
        ? `${format(dateRange.from, 'dd-MM-yyyy')} - ...`
        : title

    // Xử lý onOpenChange để không đóng popover khi chỉ chọn ngày đầu tiên
    const handleOpenChange = (newOpen: boolean) => {
        // Chỉ cho phép đóng nếu đã chọn đủ 2 ngày hoặc user click outside
        // Nếu chỉ mới chọn ngày đầu tiên (có from nhưng chưa có to), giữ popover mở
        if (!newOpen && dateRange?.from && !dateRange?.to) {
            // Không cho đóng nếu chỉ mới chọn ngày đầu tiên
            return
        }
        setOpen(newOpen)
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {displayText}
                    {dateRange?.from && dateRange?.to && (
                        <X
                            className="ml-2 h-4 w-4 cursor-pointer"
                            onClick={handleClear}
                        />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onInteractOutside={(e: { originalEvent: PointerEvent | FocusEvent }) => {
                    // Nếu chỉ mới chọn ngày đầu tiên, không cho đóng khi click outside
                    if (dateRange?.from && !dateRange?.to) {
                        e.originalEvent.preventDefault()
                    }
                }}
            >
                <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleSelect}
                    captionLayout="dropdown"
                    numberOfMonths={2}
                />
            </PopoverContent>
        </Popover>
    )
}

