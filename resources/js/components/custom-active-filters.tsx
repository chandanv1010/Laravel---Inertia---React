import { usePage, router } from "@inertiajs/react"
import { X, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { type IFilter } from "@/types"
import { useMemo } from "react"

interface ICustomActiveFilters {
    filters: IFilter[] | undefined
}

// Type cho nested filter structure: { [field]: { [operator]: string } }
type NestedFilterValue = Record<string, Record<string, string>>

// Type cho request params - có thể là string hoặc nested object
type RequestParamValue = string | NestedFilterValue | undefined

interface RequestParams {
    [key: string]: RequestParamValue
    keyword?: string
}

const CustomActiveFilters = ({ filters }: ICustomActiveFilters) => {
    const pageProps = usePage().props as { request?: RequestParams }
    const { request } = pageProps

    const activeFilters = useMemo(() => {
        if (!filters || !request) {
            return []
        }

        const active: Array<{ filter: IFilter; label: string; value: string }> = []

        filters.forEach((filter) => {
            if (filter.type === 'multiple') {
                const filterData = request[filter.key]
                
                // Parse nested structure: post_catalogue_id[id][in] = "59"
                // Laravel parse thành: { post_catalogue_id: { id: { in: "59" } } }
                if (filterData) {
                    let values: string[] = []
                    
                    // Case 1: Nested object structure { id: { in: "59" } }
                    if (typeof filterData === 'object' && filterData !== null && !Array.isArray(filterData)) {
                        const nestedFilter = filterData as NestedFilterValue
                        const nestedFieldKey = Object.keys(nestedFilter)[0]
                        
                        if (nestedFieldKey) {
                            const nestedData = nestedFilter[nestedFieldKey]
                            
                            if (nestedData && typeof nestedData === 'object' && nestedData !== null) {
                                const operator = Object.keys(nestedData)[0]
                                const rawValue = nestedData[operator]
                                
                                if (rawValue && typeof rawValue === 'string') {
                                    values = rawValue.split(',').map(v => v.trim()).filter(v => v)
                                }
                            }
                        }
                    }
                    // Case 2: Direct string value (fallback)
                    else if (typeof filterData === 'string') {
                        values = filterData.split(',').map(v => v.trim()).filter(v => v)
                    }
                    
                    // Process values
                    values.forEach((value) => {
                        const option = filter.options.find(opt => opt.value === value)
                        if (option) {
                            active.push({
                                filter,
                                label: option.label,
                                value
                            })
                        } else if (value) {
                            // Fallback: nếu không tìm thấy option, vẫn hiển thị với value
                            active.push({
                                filter,
                                label: value,
                                value
                            })
                        }
                    })
                }
            } else if (filter.type === 'single') {
                const value = request[filter.key]
                if (value && typeof value === 'string' && value !== '0' && value !== filter.defaulValue) {
                    const option = filter.options.find(opt => opt.value === value)
                    if (option) {
                        active.push({
                            filter,
                            label: option.label,
                            value
                        })
                    }
                }
            }
        })

        // Thêm keyword filter nếu có
        if (request?.keyword && typeof request.keyword === 'string' && request.keyword.trim()) {
            active.push({
                filter: {
                    key: 'keyword',
                    placeholder: 'Từ khóa',
                    type: 'single',
                    options: []
                } as IFilter,
                label: `Từ khóa: ${request.keyword}`,
                value: request.keyword
            })
        }

        // Thêm date range filter nếu có (created_at[between])
        if (request?.created_at && typeof request.created_at === 'object' && request.created_at !== null) {
            const dateFilter = request.created_at as Record<string, string>
            const betweenValue = dateFilter.between
            if (betweenValue && typeof betweenValue === 'string') {
                const dates = betweenValue.split(',')
                if (dates.length === 2) {
                    const fromDate = dates[0].trim()
                    const toDate = dates[1].trim()
                    // Format dates để hiển thị đẹp hơn
                    try {
                        const fromDateObj = new Date(fromDate)
                        const toDateObj = new Date(toDate)
                        const formatDate = (date: Date) => {
                            return date.toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            })
                        }
                        active.push({
                            filter: {
                                key: 'created_at',
                                placeholder: 'Khoảng thời gian',
                                type: 'single',
                                options: []
                            } as IFilter,
                            label: `Khoảng thời gian: ${formatDate(fromDateObj)} - ${formatDate(toDateObj)}`,
                            value: betweenValue
                        })
                    } catch (e) {
                        // Fallback nếu không parse được date
                        active.push({
                            filter: {
                                key: 'created_at',
                                placeholder: 'Khoảng thời gian',
                                type: 'single',
                                options: []
                            } as IFilter,
                            label: `Khoảng thời gian: ${fromDate} - ${toDate}`,
                            value: betweenValue
                        })
                    }
                }
            }
        }

        return active
    }, [filters, request])

    const removeFilter = (filter: IFilter, value: string) => {
        // Tạo newRequest từ request hiện tại, loại bỏ các tham số internal
        const newRequest: RequestParams = { ...request }
        
        // Xóa các tham số internal được backend thêm vào
        const requestWithInternal = newRequest as RequestParams & { _catalogue_config?: unknown; _catalogue_ids?: unknown }
        delete requestWithInternal._catalogue_config
        delete requestWithInternal._catalogue_ids
        
        if (filter.key === 'keyword') {
            delete newRequest.keyword
            
            router.get(window.location.pathname, newRequest, {
                preserveScroll: true,
                preserveState: false,
            })
            return
        }

        if (filter.type === 'multiple') {
            const filterData = request?.[filter.key]
            if (filterData && typeof filterData === 'object' && filterData !== null && !Array.isArray(filterData)) {
                const nestedFilter = filterData as NestedFilterValue
                const nestedFieldKey = Object.keys(nestedFilter)[0]
                const nestedData = nestedFilter[nestedFieldKey]
                
                if (nestedData && typeof nestedData === 'object' && nestedData !== null) {
                    const operator = Object.keys(nestedData)[0]
                    const rawValue = nestedData[operator]
                    
                    if (rawValue && typeof rawValue === 'string') {
                        const currentValues = rawValue.split(',').map(v => v.trim())
                        
                        // Xử lý đặc biệt cho catalogue filter (filter có maxCount === 0)
                        // Khi xóa một child catalogue, chỉ xóa child đó và giữ lại parent cùng các child khác
                        if (filter.maxCount === 0 && filter.options) {
                            // Tìm catalogue đang xóa trong options
                            const targetOption = filter.options.find(opt => opt.value === value)
                            if (targetOption) {
                                // Xác định level của catalogue đang xóa từ label (số lượng "|-----")
                                const targetLevel = (targetOption.label.match(/\|-----/g) || []).length
                                
                                // Nếu đây là child catalogue (level > 0), tìm parent catalogue của nó
                                if (targetLevel > 0) {
                                    // Tìm parent catalogue gần nhất: catalogue có level lớn nhất nhưng vẫn nhỏ hơn targetLevel
                                    interface ParentOption {
                                        value: string
                                        level: number
                                    }
                                    let parentOption: ParentOption | null = null
                                    let maxParentLevel = -1
                                    
                                    filter.options.forEach(opt => {
                                        if (opt.value === value) return // Bỏ qua chính catalogue đang xóa
                                        
                                        const optLevel = (opt.label.match(/\|-----/g) || []).length
                                        const isParent = optLevel < targetLevel && currentValues.includes(opt.value)
                                        
                                        if (isParent && optLevel > maxParentLevel) {
                                            maxParentLevel = optLevel
                                            parentOption = { value: opt.value, level: optLevel }
                                        }
                                    })
                                    
                                    // Nếu tìm thấy parent catalogue, giữ lại parent và loại trừ child đang xóa
                                    // Gửi request với parent + các children khác (không bao gồm child đang xóa)
                                    if (parentOption !== null) {
                                        const { level: parentLevel, value: parentValue } = parentOption
                                        
                                        // Giữ lại parent và các children khác (không bao gồm child đang xóa)
                                        const remainingValues = currentValues.filter(v => {
                                            if (v === value) return false // Xóa child đang xóa
                                            
                                            // Giữ lại parent
                                            if (v === parentValue) return true
                                            
                                            // Tìm option tương ứng với value này
                                            const opt = filter.options?.find(o => o.value === v)
                                            if (!opt) return false // Bỏ qua nếu không tìm thấy option
                                            
                                            const optLevel = (opt.label.match(/\|-----/g) || []).length
                                            // Giữ lại các child catalogues khác (level > parentLevel và không phải là child đang xóa)
                                            return optLevel > parentLevel
                                        })
                                        
                                        if (remainingValues.length === 0) {
                                            delete newRequest[filter.key]
                                        } else {
                                            // Gửi request với parent + các children khác (không bao gồm child đang xóa)
                                            newRequest[filter.key] = {
                                                [nestedFieldKey]: {
                                                    [operator]: remainingValues.join(',')
                                                }
                                            }
                                        }
                                        
                                        router.get(window.location.pathname, newRequest, {
                                            preserveScroll: true,
                                            preserveState: false,
                                        })
                                        return
                                    }
                                }
                            }
                        }
                        
                        // Logic mặc định: xóa giá trị được chỉ định
                        const values = currentValues.filter(v => v !== value)
                        
                        if (values.length === 0) {
                            delete newRequest[filter.key]
                        } else {
                            newRequest[filter.key] = {
                                [nestedFieldKey]: {
                                    [operator]: values.join(',')
                                }
                            }
                        }
                        
                        router.get(window.location.pathname, newRequest, {
                            preserveScroll: true,
                            preserveState: false,
                        })
                    }
                }
            }
        } else if (filter.type === 'single') {
            delete newRequest[filter.key]
            
            router.get(window.location.pathname, newRequest, {
                preserveScroll: true,
                preserveState: false,
            })
        }
    }

    const resetAllFilters = () => {
        // Xóa tất cả filters, chỉ giữ lại các tham số cần thiết như perpage
        const cleanRequest: RequestParams = {}
        
        // Giữ lại perpage nếu có
        if (request?.perpage) {
            cleanRequest.perpage = request.perpage
        }
        
        router.get(window.location.pathname, cleanRequest, {
            preserveScroll: true,
            preserveState: false,
        })
    }

    if (activeFilters.length === 0) return null

    return (
        <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
            {activeFilters.map((active, index) => (
                <Badge
                    key={`${active.filter.key}-${active.value}-${index}`}
                    variant="outline"
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                    <span className="text-sm">{active.label}</span>
                    <button
                        onClick={() => removeFilter(active.filter, active.value)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                        aria-label={`Remove ${active.label} filter`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            <Button
                onClick={resetAllFilters}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 px-2 py-1 h-auto text-sm rounded-md bg-white border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
            </Button>
        </div>
    )
}

export default CustomActiveFilters

