import { useState } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, router, usePage } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, PlusCircle, ChevronDown, Percent, Package, Gift, ShoppingCart, AlertTriangle } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import CustomTable from '@/components/custom-table'
import { TableRow, TableCell } from '@/components/ui/table'
import CustomConfirmDelete from '@/components/custom-confirm-delete'
import CustomPagination from '@/components/custom-pagination'
import CustomBulkAction from '@/components/custom-bulk-action'
import CustomFilter from '@/components/custom-filter'
import CustomActiveFilters from '@/components/custom-active-filters'
import CustomTableSortableHeader from '@/components/custom-table-sortable-header'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { type BreadcrumbItem, type IPaginate, type PageConfig, type IFilter } from '@/types'
import useTable from '@/hooks/use-table'
import { useFilter } from '@/hooks/use-filter'
import { type SwitchState } from '@/hooks/use-switch'
import React from 'react'

interface Promotion {
    id: number
    code: string
    name: string
    type: 'order_discount' | 'product_discount' | 'combo' | 'buy_x_get_y'
    discount_type?: 'fixed_amount' | 'percentage' | 'same_price'
    discount_value?: number
    start_date: string
    end_date: string | null
    no_end_date?: boolean
    usage_count: number
    usage_limit?: number
    publish: string
    order: number
    created_at: string
}

interface PromotionIndexProps {
    promotions: IPaginate<Promotion>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Khuyến Mãi', href: '/backend/promotion/promotion' },
]

const filters: IFilter[] = [
    {
        key: 'type',
        placeholder: 'Loại khuyến mãi',
        type: 'single',
        options: [
            { label: 'Tất cả', value: '0' },
            { label: 'Giảm giá đơn hàng', value: 'order_discount' },
            { label: 'Giảm giá sản phẩm', value: 'product_discount' },
            { label: 'Mua Combo', value: 'combo' },
            { label: 'Mua X Tặng Y', value: 'buy_x_get_y' },
        ],
        defaulValue: '0',
    },
    {
        key: 'expiry_status',
        placeholder: 'Tình trạng',
        type: 'single',
        options: [
            { label: 'Tất cả', value: 'all' },
            { label: 'Còn hạn', value: 'active' },
            { label: 'Hết hạn', value: 'expired' },
        ],
        defaulValue: 'all',
    },
]

const pageConfig: PageConfig<Promotion> = {
    module: 'promotion/promotion',
    heading: 'Quản lý Khuyến Mãi',
    cardHeading: 'Danh sách chương trình khuyến mãi',
    cardDescription: 'Quản lý các chương trình khuyến mãi: giảm giá, combo, mua tặng...',
    filters: filters,
    columns: [
        { key: 'checkbox', label: '', className: 'w-[40px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[50px]', sortable: true },
        { key: 'name', label: 'Tên chương trình', className: 'w-[250px]', sortable: false },
        { key: 'type', label: 'Loại', className: 'w-[120px]', sortable: false },
        { key: 'discount_info', label: 'Thông tin giảm giá', className: 'w-[200px] text-right', sortable: false },
        { key: 'start_date', label: 'Ngày bắt đầu', className: 'w-[150px]', sortable: true },
        { key: 'end_date', label: 'Ngày kết thúc', className: 'w-[150px]', sortable: true },
        { key: 'expiry_status', label: 'Tình Trạng', className: 'w-[150px] text-center', sortable: false },
        { key: 'publish', label: 'Trạng thái', className: 'text-center w-[120px]', sortable: false },
        { key: 'actions', label: 'Thao tác', className: 'w-[200px] text-center', sortable: false },
    ],
    switches: ['publish'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
        order_discount: 'Giảm giá đơn hàng',
        product_discount: 'Giảm giá sản phẩm',
        combo: 'Mua Combo',
        buy_x_get_y: 'Mua X Tặng Y',
    }
    return labels[type] || type
}

const getDiscountInfo = (promotion: Promotion) => {
    if (promotion.type === 'order_discount' || promotion.type === 'product_discount') {
        if (promotion.discount_type === 'fixed_amount') {
            // Format số tiền với dấu chấm ngăn cách hàng nghìn và ký hiệu ₫
            // Chuyển từ số thập phân sang số nguyên (vì tiền không có phần thập phân)
            const value = promotion.discount_value ? Math.round(Number(promotion.discount_value)) : 0
            const formattedValue = value.toLocaleString('vi-VN', { 
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).replace(/,/g, '.')
            return `Giảm ${formattedValue}₫`
        } else if (promotion.discount_type === 'percentage') {
            // Format phần trăm: chỉ hiển thị số thập phân nếu có
            const value = promotion.discount_value ? Number(promotion.discount_value) : 0
            // Kiểm tra xem có phần thập phân không
            const hasDecimal = value % 1 !== 0
            const formattedValue = hasDecimal 
                ? value.toString().replace(/\.?0+$/, '') // Xóa các số 0 thừa ở cuối
                : value.toString()
            return `Giảm ${formattedValue}%`
        } else if (promotion.discount_type === 'same_price') {
            return 'Đồng giá'
        }
    } else if (promotion.type === 'combo') {
        return 'Giá combo cố định'
    } else if (promotion.type === 'buy_x_get_y') {
        return 'Mua tặng'
    }
    return '-'
}

const getExpiryStatus = (promotion: Promotion): { status: 'expired' | 'expiring' | 'active', text: string, color: string, daysLeft?: number } => {
    const now = new Date()
    const startDate = new Date(promotion.start_date)
    const endDate = promotion.end_date ? new Date(promotion.end_date) : null
    
    // Nếu không có ngày kết thúc, luôn là active
    if (!endDate || promotion.no_end_date) {
        return { status: 'active', text: 'Còn hạn', color: 'text-green-600 bg-green-50 border-green-200' }
    }
    
    // Đã hết hạn
    if (endDate < now) {
        return { status: 'expired', text: 'Hết hạn', color: 'text-red-600 bg-red-50 border-red-200' }
    }
    
    // Tính số ngày còn lại
    const diffTime = endDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Còn 3 ngày hoặc ít hơn
    if (diffDays <= 3) {
        return { status: 'expiring', text: 'Sắp hết hạn', color: 'text-orange-600 bg-orange-50 border-orange-200', daysLeft: diffDays }
    }
    
    // Còn hạn
    return { status: 'active', text: 'Còn hạn', color: 'text-green-600 bg-green-50 border-green-200' }
}

const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const TableRowComponent = React.memo(({
    item,
    checked,
    onCheckItem,
    switches,
    onSwitchChange,
}: {
    item: Promotion
    checked: boolean
    onCheckItem: (id: number, checked: boolean) => void
    switches: SwitchState<SwitchField>
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void
}) => {
    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
    const loading = switches[item.id]?.loading ?? false
    const expiryStatus = getExpiryStatus(item)
    
    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='font-medium w-[40px] whitespace-nowrap text-center'>
                <Input 
                    type="checkbox"
                    className="size-4 cursor-pointer mx-auto"
                    checked={checked}
                    onChange={(e) => onCheckItem(item.id, e.target.checked)}
                />
            </TableCell>
            <TableCell className="font-medium w-[50px] whitespace-nowrap">{item.id}</TableCell>
            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
            <TableCell className="whitespace-nowrap">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    {getTypeLabel(item.type)}
                </span>
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-right">
                <span className="text-blue-600 font-medium">
                    {getDiscountInfo(item)}
                </span>
            </TableCell>
            <TableCell className={`whitespace-nowrap text-sm ${expiryStatus.status === 'expired' ? 'text-red-600' : ''}`}>
                {formatDateTime(item.start_date)}
            </TableCell>
            <TableCell className={`whitespace-nowrap text-sm ${expiryStatus.status === 'expired' ? 'text-red-600' : ''}`}>
                {item.no_end_date || !item.end_date ? 'Không có ngày kết thúc' : formatDateTime(item.end_date)}
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${expiryStatus.color}`}>
                                {expiryStatus.status === 'expiring' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {expiryStatus.text}
                            </span>
                        </TooltipTrigger>
                        {expiryStatus.status === 'expiring' && expiryStatus.daysLeft !== undefined && (
                            <TooltipContent>
                                <p>Cảnh báo: Chương trình khuyến mãi sẽ hết hạn sau {expiryStatus.daysLeft} ngày</p>
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <Switch 
                    className="cursor-pointer" 
                    checked={effectivePublish === '2'} 
                    onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1">
                    <Button 
                        type='button' 
                        className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]"
                        onClick={() => router.get(`/backend/promotion/promotion/${item.id}/edit`)}
                    >
                        <Edit className="w-4 h-4 text-white" />
                    </Button>
                    <CustomConfirmDelete
                        id={item.id}
                        module={pageConfig.module!}
                    >
                        <Button type='button' className="size-7 p-0 bg-[#ed5565] cursor-pointer rounded-[5px]">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </CustomConfirmDelete>
                </div>
            </TableCell>
        </TableRow>
    )
})

TableRowComponent.displayName = 'TableRowComponent'

export default function PromotionIndex({ promotions }: PromotionIndexProps) {
    const { request } = usePage().props as { request?: Record<string, unknown> };
    
    // Parse date range from request để pass vào CustomFilter
    const dateRange = React.useMemo(() => {
        if (request?.created_at) {
            const dateData = request.created_at as Record<string, unknown>;
            if (typeof dateData === 'object' && dateData !== null) {
                const betweenValue = dateData.between as string;
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
        return null;
    }, [request]);

    const { filters: filterComponents } = useFilter({
        defaultFilters: pageConfig.filters,
    })
    
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
        handleSwitchChange
    } = useTable<Promotion>({ pageConfig, records: promotions.data })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={true}
                        footerChildren={
                            <CustomPagination 
                                links={promotions.links}
                                currentPage={promotions.current_page}
                            />
                        }
                    >
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center">
                                    {selectedIds.length > 0 && (
                                        <CustomBulkAction
                                            selectedIds={selectedIds}
                                            module={pageConfig.module!}
                                            resource="promotions"
                                            setSelectedIds={setSelectedIds}
                                            className="mr-[10px]"
                                        />
                                    )}
                                    <CustomFilter 
                                        filters={filterComponents}
                                        dateRangePicker={{
                                            title: 'Lọc thời gian',
                                            name: 'created_at',
                                            defaultValue: dateRange || undefined
                                        }}
                                    />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Thêm khuyến mãi mới
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuItem 
                                            onClick={() => router.get('/backend/promotion/promotion/create?type=order_discount')}
                                            className="cursor-pointer"
                                        >
                                            <ShoppingCart className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-medium">Giảm giá đơn hàng</span>
                                                <span className="text-xs text-muted-foreground">
                                                    VD: Giảm giá 20% cho các đơn hàng từ 100.000VNĐ
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={() => router.get('/backend/promotion/promotion/create?type=product_discount')}
                                            className="cursor-pointer"
                                        >
                                            <Percent className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-medium">Giảm giá sản phẩm</span>
                                                <span className="text-xs text-muted-foreground">
                                                    VD: Giảm 15% sản phẩm Quần Nam trong đơn
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={() => router.get('/backend/promotion/promotion/create?type=buy_x_get_y')}
                                            className="cursor-pointer"
                                        >
                                            <Gift className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-medium">Mua X Tặng Y</span>
                                                <span className="text-xs text-muted-foreground">
                                                    VD: [Mua 1 Tặng 1] kem dưỡng da 100ml và Kem tẩy trang
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            onClick={() => router.get('/backend/promotion/promotion/create?type=combo')}
                                            className="cursor-pointer"
                                        >
                                            <Package className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-medium">Mua Combo</span>
                                                <span className="text-xs text-muted-foreground">
                                                    VD: Mua combo sản phẩm A B C giá 100.000VNĐ
                                                </span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CustomActiveFilters filters={filterComponents} />
                        </div>

                        <CustomTable 
                            data={promotions.data}
                            columns={[
                                {
                                    key: 'checkbox',
                                    label: (
                                        <div className="flex justify-center">
                                            <Input 
                                                type="checkbox"
                                                className="size-4 cursor-pointer"
                                                checked={isAllChecked}
                                                onChange={(e) => handleCheckAll(e.target.checked)}
                                            />
                                        </div>
                                    ),
                                    className: 'w-[40px] text-center'
                                },
                                ...(pageConfig.columns ?? [])
                                    .filter(c => c.key !== 'checkbox')
                                    .map(col => {
                                        if (col.key === 'start_date' || col.key === 'end_date') {
                                            return {
                                                ...col,
                                                label: <CustomTableSortableHeader 
                                                    columnKey={col.key} 
                                                    label={col.label} 
                                                    className={col.className}
                                                    sortable={col.sortable}
                                                />
                                            }
                                        }
                                        return col
                                    })
                            ]}
                            render={(item: Promotion) => 
                                <TableRowComponent 
                                    key={item.id}
                                    item={item}
                                    checked={selectedIds.includes(item.id)}
                                    onCheckItem={handleCheckItem}
                                    switches={switches}
                                    onSwitchChange={handleSwitchChange}
                                />
                            }
                        />
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    )
}

