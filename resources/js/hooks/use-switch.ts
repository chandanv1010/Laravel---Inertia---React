import { type PageConfig } from "@/types"
import { useCallback, useState, useEffect, useMemo } from "react"
import { router } from "@inertiajs/react"

interface IUseSwitchProps<T> { // UserCatalgoue
    module: string | undefined,
    switchFields: PageConfig<T>["switches"],
    records: T[]
}

export type SwitchState<F extends string> = Record<
    string | number,
    {
        values: Partial<Record<F, string>>,
        loading: boolean,
        loadingStartTime?: number
    }
>

// Stable empty array reference to avoid infinite loops
const EMPTY_SWITCH_FIELDS: readonly string[] = [] as const;

const useSwitch = <T extends { id: number }>({
    module,
    switchFields,
    records
}: IUseSwitchProps<T>) => {

    // Handle undefined switchFields - use stable reference for empty array
    const safeSwichFields = useMemo(
        () => switchFields || EMPTY_SWITCH_FIELDS,
        [switchFields]
    );
    type SwitchField = typeof safeSwichFields[number]

    const [switches, setSwitches] = useState<SwitchState<SwitchField>>({})

    const handleSwitchChange = useCallback((id: number, field: SwitchField, currentValue: string) => {

        // Prevent multiple clicks on the same switch while loading
        if (switches[id]?.loading) return

        const newValue = currentValue === "2" ? "1" : "2"
        const loadingStartTime = Date.now()

        setSwitches(prev => ({
            ...prev,
            [id]: {
                values: { ...prev[id]?.values, [field]: newValue },
                loading: true,
                loadingStartTime: loadingStartTime
            }
        }))

        // Determine which keys to reload based on module
        const reloadKeys = module === 'system/config' ? ['systems', 'flash'] : ['records', 'flash']

        router.patch(`/backend/${module}/${id}/toggle/${field}`, {
            field: field,
            value: newValue
        }, {
            headers: {
                Accept: "application/json",
            },
            only: reloadKeys,
            preserveScroll: true,
            preserveState: true, // Keep true to preserve optimistic update; state will sync on next full reload
            onError: () => {
                setSwitches(prev => ({
                    ...prev,
                    [id]: {
                        values: { ...prev[id]?.values, [field]: currentValue },
                        loading: false
                    }
                }))
            },
            onSuccess: () => {
                setSwitches(prev => ({
                    ...prev,
                    [id]: {
                        ...prev[id],
                        loading: false
                    }
                }))
            },
            onFinish: () => {
                // Đảm bảo loading state được clear ngay cả khi có lỗi network
                setSwitches(prev => {
                    if (prev[id]?.loading && prev[id]?.loadingStartTime === loadingStartTime) {
                        return {
                            ...prev,
                            [id]: {
                                ...prev[id],
                                loading: false
                            }
                        }
                    }
                    return prev
                })
            }
        })

    }, [module, switches])

    useEffect(() => {
        setSwitches(prev => {
            const newSwitches: SwitchState<SwitchField> = {}
            records.forEach(item => {
                // Nếu đang loading, giữ nguyên state cũ (nhưng có timeout để tránh stuck)
                if (prev[item.id]?.loading) {
                    // Giữ nguyên state nhưng thêm timeout để tránh stuck vĩnh viễn
                    const loadingStartTime = prev[item.id]?.loadingStartTime || Date.now()
                    const maxLoadingTime = 10000 // 10 seconds max

                    if (Date.now() - loadingStartTime > maxLoadingTime) {
                        // Nếu loading quá lâu, reset về false
                        newSwitches[item.id] = {
                            values: safeSwichFields.reduce(
                                (acc, field) => ({ ...acc, [field]: String(item[field]) }),
                                {} as Record<SwitchField, string>
                            ),
                            loading: false
                        }
                    } else {
                        newSwitches[item.id] = {
                            ...prev[item.id],
                            loadingStartTime: loadingStartTime
                        }
                    }
                } else {
                    // Update từ records mới
                    newSwitches[item.id] = {
                        values: safeSwichFields.reduce(
                            (acc, field) => {
                                let value = item[field]
                                // Special handling for is_translatable: convert 0/1 to '1'/'2'
                                if (field === 'is_translatable') {
                                    value = (value === 1 || value === '1') ? '2' : '1'
                                } else {
                                    value = String(value)
                                }
                                return { ...acc, [field]: value }
                            },
                            {} as Record<SwitchField, string>
                        ),
                        loading: false
                    }
                }
            })
            return newSwitches
        })
    }, [records, safeSwichFields])

    return {
        switches,
        switchFields: safeSwichFields,
        module,
        setSwitches,
        handleSwitchChange
    }
}

export default useSwitch

