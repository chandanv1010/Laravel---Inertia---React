import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import CustomCard from '@/components/custom-card'
import InputError from '@/components/input-error'

interface TimeSelectorProps {
    startDate?: Date
    endDate?: Date
    noEndDate: boolean
    startDateError?: string
    endDateError?: string
    onStartDateChange: (date: Date | undefined) => void
    onEndDateChange: (date: Date | undefined) => void
    onNoEndDateChange: (value: boolean) => void
    formatDateForInput: (date?: string | Date) => string
}

export function TimeSelector({
    startDate,
    endDate,
    noEndDate,
    startDateError,
    endDateError,
    onStartDateChange,
    onEndDateChange,
    onNoEndDateChange,
    formatDateForInput
}: TimeSelectorProps) {
    return (
        <CustomCard isShowHeader={true} title="Thời gian">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="start_date">
                        Ngày bắt đầu <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, 'dd/MM/yyyy HH:mm') : 'Chọn ngày bắt đầu'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                    if (date) {
                                        const newDate = new Date(date)
                                        if (startDate) {
                                            newDate.setHours(startDate.getHours(), startDate.getMinutes())
                                        } else {
                                            newDate.setHours(0, 0)
                                        }
                                        onStartDateChange(newDate)
                                        const input = document.getElementById('start_date') as HTMLInputElement
                                        if (input) {
                                            const year = newDate.getFullYear()
                                            const month = String(newDate.getMonth() + 1).padStart(2, '0')
                                            const day = String(newDate.getDate()).padStart(2, '0')
                                            const hours = String(newDate.getHours()).padStart(2, '0')
                                            const minutes = String(newDate.getMinutes()).padStart(2, '0')
                                            input.value = `${year}-${month}-${day}T${hours}:${minutes}`
                                        }
                                    }
                                }}
                                captionLayout="dropdown"
                            />
                            <div className="p-3 border-t">
                                <Input
                                    type="time"
                                    className="w-full"
                                    onChange={(e) => {
                                        if (startDate && e.target.value) {
                                            const [hours, minutes] = e.target.value.split(':')
                                            const newDate = new Date(startDate)
                                            newDate.setHours(parseInt(hours), parseInt(minutes))
                                            onStartDateChange(newDate)
                                            const input = document.getElementById('start_date') as HTMLInputElement
                                            if (input) {
                                                const year = newDate.getFullYear()
                                                const month = String(newDate.getMonth() + 1).padStart(2, '0')
                                                const day = String(newDate.getDate()).padStart(2, '0')
                                                input.value = `${year}-${month}-${day}T${hours}:${minutes}`
                                            }
                                        }
                                    }}
                                    defaultValue={startDate ? `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}` : ''}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                    <input
                        type="hidden"
                        id="start_date"
                        name="start_date"
                        value={startDate ? formatDateForInput(startDate) : ''}
                        required
                    />
                    <InputError message={startDateError} className="mt-1" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="end_date">Ngày kết thúc</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                                disabled={noEndDate}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, 'dd/MM/yyyy HH:mm') : 'Chọn ngày kết thúc'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={(date) => {
                                    if (date) {
                                        const newDate = new Date(date)
                                        if (endDate) {
                                            newDate.setHours(endDate.getHours(), endDate.getMinutes())
                                        } else {
                                            newDate.setHours(23, 59)
                                        }
                                        onEndDateChange(newDate)
                                        const input = document.getElementById('end_date') as HTMLInputElement
                                        if (input) {
                                            const year = newDate.getFullYear()
                                            const month = String(newDate.getMonth() + 1).padStart(2, '0')
                                            const day = String(newDate.getDate()).padStart(2, '0')
                                            const hours = String(newDate.getHours()).padStart(2, '0')
                                            const minutes = String(newDate.getMinutes()).padStart(2, '0')
                                            input.value = `${year}-${month}-${day}T${hours}:${minutes}`
                                        }
                                    }
                                }}
                                captionLayout="dropdown"
                            />
                            <div className="p-3 border-t">
                                <Input
                                    type="time"
                                    className="w-full"
                                    onChange={(e) => {
                                        if (endDate && e.target.value) {
                                            const [hours, minutes] = e.target.value.split(':')
                                            const newDate = new Date(endDate)
                                            newDate.setHours(parseInt(hours), parseInt(minutes))
                                            onEndDateChange(newDate)
                                            const input = document.getElementById('end_date') as HTMLInputElement
                                            if (input) {
                                                const year = newDate.getFullYear()
                                                const month = String(newDate.getMonth() + 1).padStart(2, '0')
                                                const day = String(newDate.getDate()).padStart(2, '0')
                                                input.value = `${year}-${month}-${day}T${hours}:${minutes}`
                                            }
                                        }
                                    }}
                                    defaultValue={endDate ? `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}` : ''}
                                />
                            </div>
                        </PopoverContent>
                    </Popover>
                    <input
                        type="hidden"
                        id="end_date"
                        name="end_date"
                        value={endDate && !noEndDate ? formatDateForInput(endDate) : ''}
                    />
                    <InputError message={endDateError} className="mt-1" />
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="no_end_date"
                        checked={noEndDate}
                        onCheckedChange={(checked) => {
                            onNoEndDateChange(checked as boolean)
                            if (checked) {
                                onEndDateChange(undefined)
                            }
                        }}
                    />
                    <Label htmlFor="no_end_date" className="cursor-pointer font-normal">
                        Không có ngày kết thúc
                    </Label>
                </div>
            </div>
        </CustomCard>
    )
}

