import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import { ImportOrder } from './save';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import CustomPagination from '@/components/custom-pagination';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý nhập hàng',
        href: '/',
    }
];

const pageConfig: PageConfig<ImportOrder> = {
    module: 'import-order',
    heading: 'Quản lý nhập hàng',
    cardHeading: 'Bảng quản lý danh sách đơn nhập hàng',
    cardDescription: 'Quản lý thông tin danh sách đơn nhập hàng, sử dụng các chức năng để lọc dữ liệu vv...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'code', label: 'Mã đơn nhập', className: 'w-[140px] text-left' },
        { key: 'created_at', label: 'Ngày tạo', className: 'w-[120px] text-left' },
        { key: 'supplier', label: 'Nhà cung cấp', className: 'w-[150px] text-center' },
        { key: 'warehouse', label: 'Chi nhánh nhập', className: 'w-[150px] text-center' },
        { key: 'total_quantity', label: 'Số lượng nhập', className: 'w-[120px] text-center' },
        { key: 'total_amount', label: 'Giá trị đơn', className: 'w-[130px] text-right' },
        { key: 'payment_status', label: 'Trạng Thái', className: 'w-[160px] text-center' },
        { key: 'status', label: 'Trạng thái nhập', className: 'w-[140px] text-center' },
        { key: 'creator', label: 'Người tạo', className: 'w-[130px] text-center', sortable: false },
    ],
}

const TableRowComponent = React.memo(({
    item,
    checked,
    onCheckItem
}: {
    item: ImportOrder,
    checked: boolean,
    onCheckItem: (id: number, checked: boolean) => void
}) => {

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'draft': { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
            'pending': { label: 'Chưa nhập', className: 'bg-orange-100 text-orange-700' },
            'completed': { label: 'Đã nhập', className: 'bg-green-100 text-green-700' },
            'cancelled': { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    };

    const getPaymentStatusBadge = (paymentAmount: number, totalAmount: number) => {
        const paid = Number(paymentAmount) || 0;
        const total = Number(totalAmount) || 0;

        if (total <= 0) {
            return { label: 'Không xác định', className: 'bg-gray-100 text-gray-700' };
        }

        if (paid >= total) {
            return { label: 'Đã thanh toán', className: 'bg-green-100 text-green-700' };
        } else if (paid > 0) {
            return { label: 'Thanh toán 1 phần', className: 'bg-blue-100 text-blue-700' };
        } else {
            return { label: 'Chưa thanh toán', className: 'bg-yellow-100 text-yellow-700' };
        }
    };

    // Format date đã được xử lý ở backend (d-m-Y)

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
    const paymentStatus = getPaymentStatusBadge(item.payment_amount || 0, item.total_amount || 0);

    // Tính tổng số lượng nhập từ items
    const totalQuantity = item.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

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
                {item.code ? (
                    <Link
                        href={`/backend/import-order/${item.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        {item.code}
                    </Link>
                ) : (
                    <span className="font-semibold">-</span>
                )}
            </TableCell>
            <TableCell className="w-[120px] text-left">
                <span className="text-sm">{item.created_at || '-'}</span>
            </TableCell>
            <TableCell className="w-[150px] text-center">{item.supplier?.name || '-'}</TableCell>
            <TableCell className="w-[150px] text-center">{item.warehouse?.name || '-'}</TableCell>
            <TableCell className="w-[120px] text-center">
                <span className="font-medium">{totalQuantity.toLocaleString('vi-VN')}</span>
            </TableCell>
            <TableCell className="w-[130px] text-right">
                <span className="font-medium">{formatCurrency(item.total_amount)}</span>
            </TableCell>
            <TableCell className="w-[160px] text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStatus.className}`}>
                    {paymentStatus.label}
                </span>
            </TableCell>
            <TableCell className="w-[140px] text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                    {status.label}
                </span>
            </TableCell>
            <TableCell className="w-[130px] text-center">{item.creators?.name || '-'}</TableCell>
        </TableRow>
    )
})

interface IImportOrderIndexProps {
    users: IPaginate<User>,
    records: IPaginate<ImportOrder>,
}

export default function ImportOrderIndex({ users, records }: IImportOrderIndexProps) {

    const { filters } = useFilter({ users: users.data, defaultFilters: pageConfig.filters })
    const {
        isAllChecked,
        selectedIds,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<ImportOrder>({ pageConfig, records: records.data })


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl  page-wrapper">
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
                            <Link href={`/backend/${pageConfig.module}/create`}>
                                <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                    <PlusCircle />
                                    Thêm bản ghi mới
                                </Button>
                            </Link>
                        </div>
                        <CustomActiveFilters filters={filters} />
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
                            render={(item: ImportOrder) =>
                                <TableRowComponent
                                    key={item.id}
                                    item={item}
                                    checked={selectedIds.includes(item.id)}
                                    onCheckItem={handleCheckItem}
                                />
                            }
                        />

                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}
