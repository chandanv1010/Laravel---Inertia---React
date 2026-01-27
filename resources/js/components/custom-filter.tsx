import { type IFilter } from "@/types"
import { Form } from "@inertiajs/react"
// import user_catalogue from "@/routes/user_catalogue"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "./ui/button"
import { Search, LoaderCircle } from "lucide-react"
import { usePage } from "@inertiajs/react"
// import { useEffect } from "react"
import { MultiSelect } from "./custom-multiple-select"
import { useEffect, useState, useMemo, useCallback } from "react"
import type { FormDataConvertible } from '@inertiajs/core'
import CustomDateRangePicker from "./custom-date-range-picker"

interface ICustomeFilter {
    filters: IFilter[] | undefined
    dateRangePicker?: {
        title: string
        name: string
        defaultValue?: { from?: string; to?: string } | null
    }
}
const CustomFilter = ({
    filters,
    dateRangePicker
}: ICustomeFilter) => {

    const { request } = usePage().props as { request?: Record<string, unknown> }

    // Parse giá trị từ request cho single select filters
    const getSingleSelectValue = useCallback((filter: IFilter): string => {
        if (!request || !filter) return (filter?.defaulValue as string) ?? '0'

        const value = request[filter.key]
        if (value !== undefined && value !== null) {
            return String(value)
        }
        return (filter?.defaulValue as string) ?? '0'
    }, [request])

    // Parse giá trị từ request cho multiple select filters
    // Format: filter.key[field][operator] = "value1,value2,value3"
    // Hoặc nested object: { filter.key: { field: { operator: "value1,value2,..." } } }
    const getMultiSelectValue = useCallback((filter: IFilter): string[] => {
        if (!request || !filter || filter.type !== 'multiple') return []

        const field = filter.field || 'id'
        const key = filter.key

        // Case 1: Kiểm tra nested object format (Laravel parse từ URL)
        // Ví dụ: post_catalogue_id[id][in]=59 -> { post_catalogue_id: { id: { in: "59" } } }
        const nestedData = request[key]
        if (nestedData && typeof nestedData === 'object') {
            const fieldData = (nestedData as Record<string, unknown>)[field]
            if (fieldData && typeof fieldData === 'object') {
                // Lấy giá trị từ operator (in, between, equal, ...)
                const operators = ['in', 'between', 'equal', filter.operator].filter(Boolean)
                for (const op of operators) {
                    const value = (fieldData as Record<string, unknown>)[op as string]
                    if (typeof value === 'string' && value) {
                        return value.split(',').map(v => v.trim()).filter(v => v)
                    }
                }
            }
        }

        // Case 2: Kiểm tra flat key format (key[field][operator])
        const matchingKeys = Object.keys(request).filter(reqKey => {
            // Pattern: key[field][operator]
            const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\[.*\\]$`)
            return pattern.test(reqKey)
        })

        if (matchingKeys.length > 0) {
            // Lấy giá trị từ key đầu tiên (thường chỉ có 1)
            const value = request[matchingKeys[0]]
            if (typeof value === 'string' && value) {
                return value.split(',').map(v => v.trim()).filter(v => v)
            }
        }

        return []
    }, [request])

    // Tính toán giá trị từ request - dùng useMemo để tính toán
    const requestMultiValues = useMemo(() => {
        const values: Record<string, string[]> = {}
        filters?.forEach(filter => {
            if (filter.type === 'multiple') {
                const parsedValues = getMultiSelectValue(filter)
                values[filter.key] = parsedValues
            }
        })
        return values
    }, [request, filters, getMultiSelectValue])

    // State để lưu giá trị hiện tại (từ request hoặc user đang chọn)
    const [multiValues, setMultiValues] = useState<Record<string, string[]>>(() => {
        const initial: Record<string, string[]> = {}
        filters?.forEach(filter => {
            if (filter.type === 'multiple') {
                initial[filter.key] = getMultiSelectValue(filter)
            }
        })
        return initial
    })

    // Sync multiValues với requestMultiValues khi request thay đổi
    // Sử dụng functional update và so sánh để chỉ update khi có thay đổi
    useEffect(() => {
        setMultiValues(prev => {
            // So sánh để chỉ update khi có thay đổi thực sự
            const hasChanges = Object.keys(requestMultiValues).some(key => {
                const current = prev[key] || []
                const next = requestMultiValues[key] || []
                // So sánh sau khi sort để tránh vấn đề với thứ tự
                const currentStr = JSON.stringify([...current].sort())
                const nextStr = JSON.stringify([...next].sort())
                return currentStr !== nextStr
            }) || Object.keys(prev).some(key => !requestMultiValues.hasOwnProperty(key))

            if (hasChanges) {
                // Tạo object mới với các array mới để đảm bảo reference thay đổi
                const newMultiValues: Record<string, string[]> = {}
                Object.keys(requestMultiValues).forEach(key => {
                    newMultiValues[key] = [...requestMultiValues[key]]
                })
                return newMultiValues
            }

            return prev
        })
    }, [requestMultiValues])

    // Parse date range từ request
    const parsedDateRange = useMemo(() => {
        if (dateRangePicker && request && request[dateRangePicker.name]) {
            const dateData = request[dateRangePicker.name] as unknown;
            if (typeof dateData === 'object' && dateData !== null) {
                const dateObj = dateData as Record<string, unknown>;
                if (dateObj.between) {
                    const betweenValue = dateObj.between as string;
                    if (betweenValue) {
                        const dates = betweenValue.split(',');
                        if (dates.length === 2) {
                            return {
                                from: dates[0].trim(),
                                to: dates[1].trim(),
                            };
                        }
                    }
                }
            }
        }
        return dateRangePicker?.defaultValue || null;
    }, [request, dateRangePicker])

    const [dateRange, setDateRange] = useState<{ from?: string; to?: string } | null>(parsedDateRange)

    // Sync dateRange khi parsedDateRange thay đổi
    useEffect(() => {
        setDateRange(parsedDateRange);
    }, [parsedDateRange])

    const handleMultiFilterChange = (key: string, values: string[]) => {
        setMultiValues(prev => ({
            ...prev,
            [key]: values
        }))
    }

    return (
        <Form
            method="get"
            action=""
            options={{
                preserveScroll: true,
                preserveState: false,
            }}
            transform={(data) => {
                const transformed: Record<string, FormDataConvertible> = { ...data }
                filters?.forEach(filter => {
                    const key = filter.key
                    const values = multiValues[key] || []

                    if (filter.type === 'multiple') {
                        if (values.length > 0) {
                            let operator = filter.operator
                            const field = filter.field
                            if (!operator) {
                                if (values.length === 1) operator = 'equal'
                                else if (values.length === 2) operator = 'between'
                                else operator = 'in'
                            }
                            transformed[`${key}[${field}][${operator}]`] = values.join(',')
                        } else {
                            transformed[key] = []
                        }
                    }
                })

                // Thêm date range vào form data nếu có
                if (dateRangePicker && dateRange && dateRange.from && dateRange.to) {
                    transformed[`${dateRangePicker.name}[between]`] = `${dateRange.from},${dateRange.to}`
                }

                return transformed

            }}
        >
            {({ processing }) => (
                <div className="flex">
                    {filters && filters.map(filter =>
                        filter.type === 'single' ? (
                            <Select
                                key={filter.key}
                                // onValueChange={() => {}}
                                defaultValue={getSingleSelectValue(filter)}
                                name={filter.key}
                            >
                                <SelectTrigger className={`w-[180px] mr-[10px] cursor-pointer rounded-[5px] ${filter.className ? filter.className : ''}`}>
                                    <SelectValue placeholder={filter.placeholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filter.options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                            <MultiSelect
                                key={`${filter.key}-${JSON.stringify((multiValues[filter.key] || []).sort())}`}
                                options={filter.options}
                                variant="inverted"
                                onValueChange={(values) => handleMultiFilterChange(filter.key, values)}
                                defaultValue={multiValues[filter.key] ? [...multiValues[filter.key]] : []}
                                name={filter.key}
                                maxWidth="350px"
                                className="min-h-[36px] rounded-[5px] mr-[10px]"
                                placeholder={filter.placeholder}
                                maxCount={filter.maxCount ?? 3}
                                singleLine={false}
                                autoSize={true}
                                resetOnDefaultValueChange={true}
                            />
                        )
                    )}
                    {dateRangePicker && (
                        <CustomDateRangePicker
                            title={dateRangePicker.title}
                            name={dateRangePicker.name}
                            defaultValue={dateRangePicker.defaultValue || undefined}
                            onStateChange={setDateRange}
                            className="mr-[10px] rounded-[5px]"
                        />
                    )}
                    <Input
                        name="keyword"
                        type="text"
                        placeholder="Nhập từ khóa muốn tìm kiếm"
                        className="w-[300px] text-[8px] rounded-[5px] mr-[10px]"
                        defaultValue={request?.keyword ? String(request.keyword) : ''}
                    />
                    <Button className="rounded-[5px] cursor-pointer bg-[#0088FF] hover:bg-[#0088FF]/80 font-light flex items-center">
                        {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search />}
                        <span>Tìm kiếm</span>
                    </Button>
                </div>
            )}



        </Form>
    )
}
export default CustomFilter

// user_catalogues[between]=1,2 --> ép cứng: id

/**
 * user_catalogues[id][between] = 1,2
 * user_catalogues[permissions][id][in]=1,2
 * user_catalogues[publish][equal]=1
 * users --> trên 1 quan hệ nào đó của users --> user_catalogues --> permissions 
 * 
 *  [
 *      id => [
 *          between => 1,2
 *      ],
 *      publish => [
 *          equal => 1
 *      ]
 *      permissions => [
 *            id => [
 *              in => 1,2       
 *            ]
 *      ]
 *  ]
 * 
 */