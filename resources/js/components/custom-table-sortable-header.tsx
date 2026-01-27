import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { router } from '@inertiajs/react'
import { usePage } from '@inertiajs/react'

interface ICustomTableSortableHeaderProps {
    columnKey: string
    label: string
    className?: string
    sortable?: boolean
}

const CustomTableSortableHeader = ({ 
    columnKey, 
    label, 
    className = '',
    sortable = true 
}: ICustomTableSortableHeaderProps) => {
    const pageProps = usePage().props as { request?: { sort?: string | string[] } }
    const currentSort = pageProps.request?.sort
    
    // Parse current sort: "field,direction" -> { field: "field", direction: "asc" | "desc" }
    const getCurrentSort = () => {
        if (!currentSort) return null
        
        // Handle case where sort might be an array
        let sortValue: string
        if (Array.isArray(currentSort)) {
            sortValue = currentSort[0] || ''
        } else if (typeof currentSort === 'string') {
            sortValue = currentSort
        } else {
            return null
        }
        
        if (!sortValue) return null
        
        const [field, direction] = sortValue.split(',')
        return { field, direction: direction || 'asc' }
    }
    
    const sortInfo = getCurrentSort()
    const isActive = sortInfo?.field === columnKey
    const currentDirection = isActive ? sortInfo.direction : null
    
    const handleSort = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!sortable) return
        
        const newDirection = isActive && currentDirection === 'asc' ? 'desc' : 'asc'
        const newSort = `${columnKey},${newDirection}`
        
        // Get current URL params
        const urlParams = new URLSearchParams(window.location.search)
        urlParams.set('sort', newSort)
        
        // Navigate with new sort param
        router.get(window.location.pathname, Object.fromEntries(urlParams), {
            preserveScroll: true,
            preserveState: false,
        })
    }
    
    // Kiểm tra xem có text-center trong className không
    const hasTextCenter = className.includes('text-center')
    const hasTextRight = className.includes('text-right')
    const justifyClass = hasTextCenter ? 'justify-center' : (hasTextRight ? 'justify-end' : 'justify-start')
    
    if (!sortable) {
        return (
            <div className={className}>
                {label}
            </div>
        )
    }
    
    return (
        <div 
            className={`flex items-center gap-1 cursor-pointer select-none hover:opacity-70 transition-opacity ${justifyClass} ${className}`}
            onClick={handleSort}
        >
            <span>{label}</span>
            <div className="flex flex-col">
                {isActive ? (
                    currentDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3 text-blue-600" />
                    ) : (
                        <ArrowDown className="h-3 w-3 text-blue-600" />
                    )
                ) : (
                    <ArrowUpDown className="h-3 w-3 text-gray-400" />
                )}
            </div>
        </div>
    )
}

export default CustomTableSortableHeader

