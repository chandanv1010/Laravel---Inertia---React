import { useState, useEffect } from 'react'
import { router } from '@inertiajs/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

interface Store {
    value: number
    label: string
}

interface TransactionFiltersProps {
    filters: {
        keyword?: string
        transaction_type?: string
        store_id?: number
        start_date?: string
        end_date?: string
    }
    stores: Store[]
}

export default function TransactionFilters({ filters, stores }: TransactionFiltersProps) {
    const [keyword, setKeyword] = useState(filters.keyword || '')
    const [transactionType, setTransactionType] = useState(filters.transaction_type || 'all')
    const [storeId, setStoreId] = useState(filters.store_id?.toString() || 'all')
    const [startDate, setStartDate] = useState(filters.start_date || '')
    const [endDate, setEndDate] = useState(filters.end_date || '')

    const debouncedKeyword = useDebouncedValue(keyword, 500)

    useEffect(() => {
        applyFilters()
    }, [debouncedKeyword])

    const applyFilters = () => {
        const params: any = {}

        if (debouncedKeyword) {
            params.keyword = debouncedKeyword
        }
        if (transactionType && transactionType !== 'all') {
            params.transaction_type = transactionType
        }
        if (storeId && storeId !== 'all') {
            params.store_id = storeId
        }
        if (startDate) {
            params.start_date = startDate
        }
        if (endDate) {
            params.end_date = endDate
        }

        router.get('/backend/cash-book/transaction', params, {
            preserveState: true,
            preserveScroll: true,
        })
    }

    const handleClearFilters = () => {
        setKeyword('')
        setTransactionType('all')
        setStoreId('all')
        setStartDate('')
        setEndDate('')

        router.get('/backend/cash-book/transaction', {}, {
            preserveState: true,
            preserveScroll: true,
        })
    }

    const handleFilterChange = () => {
        applyFilters()
    }

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm mã phiếu, mã chứng từ gốc..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="pl-9"
                />
            </div>

            <Select value={transactionType} onValueChange={(v) => { setTransactionType(v); setTimeout(handleFilterChange, 100) }}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Loại chứng từ" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="receipt">Phiếu thu</SelectItem>
                    <SelectItem value="payment">Phiếu chi</SelectItem>
                    <SelectItem value="transfer">Chuyển quỹ</SelectItem>
                </SelectContent>
            </Select>

            <Select value={storeId} onValueChange={(v) => { setStoreId(v); setTimeout(handleFilterChange, 100) }}>
                <SelectTrigger className="w-40">
                    <SelectValue placeholder="Chi nhánh" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {stores.map((store) => (
                        <SelectItem key={store.value} value={store.value.toString()}>
                            {store.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setTimeout(handleFilterChange, 100) }}
                className="w-40"
            />

            <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setTimeout(handleFilterChange, 100) }}
                className="w-40"
            />

            {(keyword || transactionType !== 'all' || storeId !== 'all' || startDate || endDate) && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFilters}
                    className="h-9 w-9"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
