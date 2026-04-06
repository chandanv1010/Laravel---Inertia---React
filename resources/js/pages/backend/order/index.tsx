
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { ShoppingBag, Eye, CreditCard, Package, Clock, CheckCircle2, XCircle, Truck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import CustomPagination from '@/components/custom-pagination';
import useTable from '@/hooks/use-table';
import CustomActiveFilters from '@/components/custom-active-filters';

interface Order {
    id: number;
    order_code: string;
    customer_name: string;
    customer_phone: string;
    total_amount: number | string;
    payment_status: string;
    order_status: string;
    created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Quản lý đơn hàng', href: '#' }
];

const ORDER_STATUSES: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: 'Chờ xử lý', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: Clock },
    processing: { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Package },
    shipping: { label: 'Đang giao', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: Truck },
    completed: { label: 'Hoàn thành', color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle2 },
    cancelled: { label: 'Đã hủy', color: 'bg-red-50 text-red-600 border-red-100', icon: XCircle },
};

const PAYMENT_STATUSES: Record<string, { label: string, color: string }> = {
    unpaid: { label: 'Chưa thanh toán', color: 'bg-slate-100 text-slate-600' },
    paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Thanh toán lỗi', color: 'bg-red-100 text-red-700' },
    refunded: { label: 'Đã hoàn tiền', color: 'bg-purple-100 text-purple-700' },
};

const pageConfig: PageConfig<Order> = {
    module: 'order',
    heading: 'Quản lý Đơn Hàng',
    cardHeading: 'Danh sách đơn hàng hệ thống',
    cardDescription: 'Theo dõi, cập nhật trạng thái và xử lý các đơn hàng từ khách hàng.',
    filters: [
        {
            key: 'order_status',
            type: 'single',
            placeholder: 'Trạng thái đơn',
            options: Object.entries(ORDER_STATUSES).map(([value, info]) => ({ value, label: info.label }))
        },
        {
            key: 'payment_status',
            type: 'single',
            placeholder: 'Trạng thái thanh toán',
            options: Object.entries(PAYMENT_STATUSES).map(([value, info]) => ({ value, label: info.label }))
        }
    ],
    columns: [
        { key: 'id', label: 'ID', className: 'w-[80px]', sortable: true },
        { key: 'order_code', label: 'Mã đơn hàng', className: 'w-[180px]', sortable: true },
        { key: 'customer', label: 'Khách hàng', sortable: false },
        { key: 'total_amount', label: 'Tổng tiền', className: 'text-right', sortable: true },
        { key: 'order_status', label: 'Trạng thái đơn', className: 'text-center', sortable: true },
        { key: 'payment_status', label: 'Thanh toán', className: 'text-center', sortable: true },
        { key: 'created_at', label: 'Ngày đặt', className: 'text-center', sortable: true },
        { key: 'actions', label: 'Thao tác', className: 'w-[100px] text-center', sortable: false },
    ],
}

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
};

const TableRowComponent = React.memo(({ item }: { item: Order }) => {
    const status = ORDER_STATUSES[item.order_status] || { label: item.order_status, color: 'bg-gray-100', icon: AlertCircle };
    const payStatus = PAYMENT_STATUSES[item.payment_status] || { label: item.payment_status, color: 'bg-gray-100' };
    const StatusIcon = status.icon;

    return (
        <TableRow className="hover:bg-gray-50/50 transition-colors cursor-pointer group" onClick={() => window.location.href = `/backend/order/${item.id}`}>
            <TableCell className="font-medium text-gray-400">#{item.id}</TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-wider">{item.order_code}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{item.customer_name}</span>
                    <span className="text-xs text-gray-400">{item.customer_phone}</span>
                </div>
            </TableCell>
            <TableCell className="text-right font-black text-gray-900">
                {formatPrice(item.total_amount)}
            </TableCell>
            <TableCell className="text-center">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${status.color}`}>
                    <StatusIcon size={12} />
                    {status.label}
                </span>
            </TableCell>
            <TableCell className="text-center">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${payStatus.color}`}>
                    {payStatus.label}
                </span>
            </TableCell>
            <TableCell className="text-center text-gray-500 text-sm">
                {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </TableCell>
            <TableCell className="text-center">
                <Link href={`/backend/order/${item.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all border border-transparent hover:border-blue-100">
                        <Eye size={16} />
                    </Button>
                </Link>
            </TableCell>
        </TableRow>
    );
});

export default function OrderIndex({ records }: { records: IPaginate<Order> }) {
    const { filters } = useFilter({ defaultFilters: pageConfig.filters })
    const { selectedIds, handleCheckAll, handleCheckItem, isAllChecked } = useTable<Order>({ pageConfig, records: records.data })

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 page-wrapper bg-[#f8f9fa]">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container max-w-7xl mx-auto w-full">
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
                        <div className="flex flex-col mb-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 flex items-center gap-3">
                                    <CustomFilter filters={filters} />
                                </div>
                            </div>
                            <CustomActiveFilters filters={filters} />
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                            <CustomTable 
                                data={records.data}
                                columns={pageConfig.columns || []}
                                render={(item: Order) => <TableRowComponent key={item.id} item={item} />}
                            />
                        </div>
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}

