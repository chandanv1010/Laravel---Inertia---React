import { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface Partner {
    value: number
    label: string
}

interface PartnerSearchSelectProps {
    value?: string | number
    onValueChange: (value: string, label?: string) => void
    partnerType: 'customer' | 'supplier' | 'employee'
    placeholder?: string
    disabled?: boolean
    initialData?: Partner[] // Pre-loaded data from server
}

export function PartnerSearchSelect({
    value,
    onValueChange,
    partnerType,
    placeholder = 'Tìm kiếm...',
    disabled = false,
    initialData = [],
}: PartnerSearchSelectProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [partners, setPartners] = useState<Partner[]>(initialData)
    const [loading, setLoading] = useState(false)
    const [selectedLabel, setSelectedLabel] = useState('')
    const hasLoadedInitial = useRef(initialData.length > 0)

    // Update partners when initialData changes
    useEffect(() => {
        if (initialData.length > 0 && !hasLoadedInitial.current) {
            setPartners(initialData)
            hasLoadedInitial.current = true
        }
    }, [initialData])

    // Set initial label from initialData if value exists
    useEffect(() => {
        if (value && initialData.length > 0 && !selectedLabel) {
            const selected = initialData.find((p) => p.value.toString() === value.toString())
            if (selected) {
                setSelectedLabel(selected.label)
            }
        }
    }, [value, initialData])

    // Search when user types
    useEffect(() => {
        if (!search) {
            // Reset to initial data when search is cleared
            if (initialData.length > 0) {
                setPartners(initialData)
            }
            return
        }

        const timeoutId = setTimeout(() => {
            fetchPartners(search)
        }, 300) // Debounce 300ms

        return () => clearTimeout(timeoutId)
    }, [search])

    const fetchPartners = async (keyword: string) => {
        setLoading(true)
        try {
            const response = await fetch(
                `/backend/cash-book/transaction/search-partners?type=${partnerType}&keyword=${encodeURIComponent(keyword)}&limit=20`
            )
            const data = await response.json()
            setPartners(data || [])
        } catch (error) {
            console.error('Failed to fetch partners:', error)
            setPartners([])
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = (currentValue: string) => {
        const selectedPartner = partners.find(p => p.value.toString() === currentValue)
        if (selectedPartner) {
            setSelectedLabel(selectedPartner.label)
            onValueChange(currentValue, selectedPartner.label)
        }
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between cursor-pointer"
                    disabled={disabled}
                >
                    <span className="truncate">
                        {value && selectedLabel
                            ? selectedLabel
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={placeholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList className="max-h-[200px]">
                        {loading ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                    Đang tải...
                                </span>
                            </div>
                        ) : partners.length === 0 ? (
                            <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                        ) : (
                            <CommandGroup>
                                {partners.map((partner) => (
                                    <CommandItem
                                        key={partner.value}
                                        value={partner.value.toString()}
                                        onSelect={handleSelect}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                value?.toString() === partner.value.toString()
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            )}
                                        />
                                        {partner.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
