import { PageConfig } from "@/types"
import useSwitch from "./use-switch"
import { useState, useMemo, useCallback } from "react"
import { router } from "@inertiajs/react"


interface IUseTableProps <T> {
    pageConfig: PageConfig<T>,
    records: T[]
}
const useTable = <T extends {id: number}>({
    pageConfig,
    records
}: IUseTableProps<T>) => {

    const { switches, handleSwitchChange } = useSwitch<T>({module: pageConfig.module, switchFields: pageConfig.switches, records })
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [robotsLoading, setRobotsLoading] = useState<Record<number, boolean>>({})
    const [robotsValues, setRobotsValues] = useState<Record<number, string>>({})

    const handleCheckAll = (checked: boolean) => {
        if(checked) {
            setSelectedIds(records.map(item => item.id))
        }else{
            setSelectedIds([])
        }
    }

    const handleCheckItem = useCallback((id: number, checked: boolean) => {
        if(checked){
            setSelectedIds(prev => [...prev, id])
        }else{
            setSelectedIds(prev => prev.filter(itemId => itemId !== id))
        }


    }, [])

    const handleRobotsChange = useCallback((id: number, currentValue: string) => {
        if (robotsLoading[id]) return
        
        const oldValue = currentValue || 'index'
        const newValue = oldValue === 'index' ? 'noindex' : 'index'
        
        // Optimistic update: cập nhật ngay lập tức
        setRobotsValues(prev => ({ ...prev, [id]: newValue }))
        setRobotsLoading(prev => ({ ...prev, [id]: true }))
        
        router.patch(`/backend/${pageConfig.module}/${id}/toggle/robots`, {
            field: 'robots',
            value: newValue
        }, {
            headers: {
                Accept: "application/json",
            },
            preserveScroll: true,
            preserveState: false, // Không preserve state để reload lại dữ liệu mới
            onError: (errors) => {
                console.error('Robots toggle error:', errors)
                // Rollback: khôi phục giá trị cũ
                setRobotsValues(prev => {
                    const updated = { ...prev }
                    updated[id] = oldValue
                    return updated
                })
                setRobotsLoading(prev => ({ ...prev, [id]: false }))
            },
            onSuccess: () => {
                // Giữ nguyên giá trị mới (đã được update optimistically)
                setRobotsLoading(prev => ({ ...prev, [id]: false }))
            },
            onFinish: () => {
                setRobotsLoading(prev => ({ ...prev, [id]: false }))
            }
        })
    }, [robotsLoading, pageConfig.module])


    const isAllChecked = useMemo(
        () => records.length > 0 && records.length === selectedIds.length,
        [selectedIds, records]
    )

    return {
        switches,
        selectedIds,
        isAllChecked,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
        handleRobotsChange,
        robotsLoading,
        robotsValues
    }

}

export default useTable

