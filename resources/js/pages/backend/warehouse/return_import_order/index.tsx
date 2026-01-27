import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { ChevronDown, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React, { useState, useCallback } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import CustomPagination from '@/components/custom-pagination';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SelectImportOrderModal from './components/select-import-order-modal';

interface Supplier {
    id: number;
    name: string;
}

interface Warehouse {
    id: number;
    name: string;
}

interface ReturnImportOrder {
    id: number;
    code: string;
    import_order_id?: number;
    importOrder?: { id: number; code: string };
    supplier_id?: number;
    supplier?: Supplier;
    warehouse_id?: number;
    warehouse?: Warehouse;
    return_type: 'by_order' | 'without_order';
    return_reason?: string;
    total_amount: number;
    discount: number;
    return_cost: number;
    deduction: number;
    refund_amount: number;
    refund_status?: string;
    export_to_stock: boolean;
    status: string;
    notes?: string;
    creators?: { id: number; name: string };
    items?: Array<{
        id: number;
        product_id: number;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
    }>;
    created_at?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Trả hàng NCC',
        href: '/',
    }
];

const pageConfig: PageConfig<ReturnImportOrder> = {
    module: 'return-import-order',
    heading: 'Trả hàng nhà cung cấp',
    cardHeading: 'Danh sách đơn trả hàng NCC',
    cardDescription: 'Quản lý các đơn trả hàng cho nhà cung cấp',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'code', label: 'Mã đơn trả', className: 'w-[140px] text-left' },
        { key: 'created_at', label: 'Ngày tạo', className: 'w-[120px] text-left' },
        { key: 'return_type', label: 'Loại trả', className: 'w-[140px] text-center' },
        { key: 'import_order', label: 'Đơn nhập gốc', className: 'w-[130px] text-center' },
        { key: 'supplier', label: 'Nhà cung cấp', className: 'w-[150px] text-center' },
        { key: 'warehouse', label: 'Chi nhánh', className: 'w-[130px] text-center' },
        { key: 'total_quantity', label: 'SL trả', className: 'w-[80px] text-center' },
        { key: 'refund_amount', label: 'Tiền hoàn', className: 'w-[120px] text-right' },
        { key: 'status', label: 'Trạng thái', className: 'w-[110px] text-center' },
        { key: 'refund_status', label: 'Tiền hoàn', className: 'w-[110px] text-center' },
        { key: 'creator', label: 'Người tạo', className: 'w-[120px] text-center' },
    ],
}

const TableRowComponent = React.memo(({
    item,
    checked,
    onCheckItem
}: {
    item: ReturnImportOrder,
    checked: boolean,
    onCheckItem: (id: number, checked: boolean) => void
}) => {

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'pending': { label: 'Chờ xuất kho', className: 'bg-orange-100 text-orange-700' },
            'completed': { label: 'Hoàn thành', className: 'bg-green-100 text-green-700' },
            'cancelled': { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    };

    const getRefundStatusBadge = (refundStatus: string | undefined) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'later': { label: 'Chờ hoàn', className: 'bg-orange-100 text-orange-700' },
            'received': { label: 'Đã nhận', className: 'bg-green-100 text-green-700' },
            'refunded': { label: 'Đã nhận', className: 'bg-green-100 text-green-700' },
            'partial': { label: 'Hoàn 1 phần', className: 'bg-blue-100 text-blue-700' },
        };
        return statusMap[refundStatus || 'later'] || { label: 'Chờ hoàn', className: 'bg-orange-100 text-orange-700' };
    };

    const getReturnTypeBadge = (type: string) => {
        const typeMap: Record<string, { label: string; className: string }> = {
            'by_order': { label: 'Theo đơn', className: 'bg-blue-100 text-blue-700' },
            'without_order': { label: 'Không theo đơn', className: 'bg-purple-100 text-purple-700' },
        };
        return typeMap[type] || { label: type, className: 'bg-gray-100 text-gray-700' };
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const status = getStatusBadge(item.status);
    const refundStatusBadge = getRefundStatusBadge(item.refund_status);
    const returnType = getReturnTypeBadge(item.return_type);
    const totalQuantity = item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='w-[60px] text-center align-middle'>
                <div className="flex justify-center items-center">
                    <Input
                        type="checkbox"
                        className="size-4 cursor-pointer"
                        checked={checked}
                        onChange={e => onCheckItem(item.id, e.target.checked)}
                    />
                </div>
            </TableCell>
            <TableCell className="w-[140px] text-left">
                <Link
                    href={`/backend/return-import-order/${item.id}`}
                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                    {item.code || '-'}
                </Link>
            </TableCell>
            <TableCell className="w-[120px] text-left">
                <span className="text-sm">{item.created_at || '-'}</span>
            </TableCell>
            <TableCell className="w-[140px] text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${returnType.className}`}>
                    {returnType.label}
                </span>
            </TableCell>
            <TableCell className="w-[130px] text-center">
                {item.importOrder?.code ? (
                    <Link
                        href={`/backend/import-order/${item.import_order_id}`}
                        className="text-blue-600 hover:underline text-sm"
                    >
                        {item.importOrder.code}
                    </Link>
                ) : '-'}
            </TableCell>
            <TableCell className="w-[150px] text-center">{item.supplier?.name || '-'}</TableCell>
            <TableCell className="w-[130px] text-center">{item.warehouse?.name || '-'}</TableCell>
            <TableCell className="w-[100px] text-center">
                <span className="font-medium">{totalQuantity.toLocaleString('vi-VN')}</span>
            </TableCell>
            <TableCell className="w-[130px] text-right">
                <span className="font-medium text-green-600">{formatCurrency(item.refund_amount)}</span>
            </TableCell>
            <TableCell className="w-[110px] text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                </span>
            </TableCell>
            <TableCell className="w-[110px] text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${refundStatusBadge.className}`}>
                    {refundStatusBadge.label}
                </span>
            </TableCell>
            <TableCell className="w-[120px] text-center">{item.creators?.name || '-'}</TableCell>
        </TableRow>
    )
})

interface IReturnImportOrderIndexProps {
    users: IPaginate<User>,
    records: IPaginate<ReturnImportOrder>,
    suppliers?: Array<{ value: string; label: string }>,
    warehouses?: Array<{ value: string; label: string }>,
}

export default function ReturnImportOrderIndex({ users, records, suppliers = [], warehouses = [] }: IReturnImportOrderIndexProps) {

    const { filters } = useFilter({ users: users.data, defaultFilters: pageConfig.filters })
    const {
        isAllChecked,
        selectedIds,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<ReturnImportOrder>({ pageConfig, records: records.data })

    const [showSelectOrderModal, setShowSelectOrderModal] = useState(false);

    const handleSelectImportOrder = useCallback((importOrderId: number) => {
        setShowSelectOrderModal(false);
        router.visit(`/backend/return-import-order/create?type=by_order&import_order_id=${importOrderId}`);
    }, []);

    const handleReturnWithoutOrder = useCallback(() => {
        router.visit('/backend/return-import-order/create?type=without_order');
    }, []);

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
                                links={records.links}
                                currentPage={records.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                {selectedIds.length > 0 &&
                                    <CustomBulkAction
                                        className="mr-[10px]"
                                        module={pageConfig.module!}
                                        selectedIds={selectedIds}
                                        setSelectedIds={setSelectedIds}
                                    />
                                }
                                <CustomFilter
                                    filters={filters}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                        <Package className="mr-2 h-4 w-4" />
                                        Tạo đơn trả hàng
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem
                                        onClick={() => setShowSelectOrderModal(true)}
                                        className="cursor-pointer"
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Trả hàng theo đơn nhập
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleReturnWithoutOrder}
                                        className="cursor-pointer"
                                    >
                                        <Package className="mr-2 h-4 w-4" />
                                        Trả hàng không theo đơn
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CustomActiveFilters filters={filters} />

                        {records.data.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                                    Chưa có đơn trả hàng nào
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Bấm nút "Tạo đơn trả hàng" để bắt đầu
                                </p>
                            </div>
                        ) : (
                            <CustomTable
                                data={records.data}
                                columns={[
                                    {
                                        key: 'checkbox',
                                        label: (
                                            <div className="flex justify-center items-center">
                                                <Input
                                                    type="checkbox"
                                                    className="size-4 cursor-pointer"
                                                    checked={isAllChecked}
                                                    onChange={(e) => handleCheckAll(e.target.checked)}
                                                />
                                            </div>
                                        ),
                                        className: 'w-[60px] text-center'
                                    },
                                    ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                                ]}
                                render={(item: ReturnImportOrder) =>
                                    <TableRowComponent
                                        key={item.id}
                                        item={item}
                                        checked={selectedIds.includes(item.id)}
                                        onCheckItem={handleCheckItem}
                                    />
                                }
                            />
                        )}
                    </CustomCard>
                </div>
            </div>

            {/* Modal chọn đơn nhập để trả hàng */}
            <SelectImportOrderModal
                open={showSelectOrderModal}
                onOpenChange={setShowSelectOrderModal}
                onSelect={handleSelectImportOrder}
            />
        </AppLayout>
    );
}
