
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate, type PageConfig } from '@/types';
import { Head, Link } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { 
    Clock, Package, Truck, CheckCircle2, XCircle, 
    AlertCircle, Eye
} from 'lucide-react';
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
    order_status: string;
    payment_status: string;
    created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Quản lý ', href: '/' }
];

const ORDER_STATUSES: Record<string, { label: string, color: string, icon: any }> = {
    pending: { label: 'Chờ xử lý', color: 'text-orange-600 bg-orange-50 border-orange-100', icon: Clock },
    processing: { label: 'Đang xử lý', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Package },
    shipping: { label: 'Đang giao', color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Truck },
    completed: { label: 'Hoàn thành', color: 'text-green-600 bg-green-50 border-green-100', icon: CheckCircle2 },
    cancelled: { label: 'Đã hủy', color: 'text-red-600 bg-red-50 border-red-100', icon: XCircle },
};

const PAYMENT_STATUSES: Record<string, { label: string, color: string }> = {
    unpaid: { label: 'Chưa thanh toán', color: 'bg-slate-100 text-slate-600' },
    paid: { label: 'Đã thanh toán', color: 'bg-green-100 text-green-700' },
    failed: { label: 'Thanh toán lỗi', color: 'bg-red-100 text-red-700' },
    refunded: { label: 'Đã hoàn tiền', color: 'bg-purple-100 text-purple-700' },
};

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
};

const pageConfig: PageConfig<Order> = {
    module: 'order',
    heading: 'Quản lý Đơn Hàng',
    cardHeading: 'Bảng quản lý danh sách Đơn Hàng',
    cardDescription: 'Quản lý thông tin danh sách Đơn Hàng, sử dụng các chức năng để lọc dữ liệu vv...',
    columns: [
        { key: 'id', label: 'ID', className: 'w-[80px]' },
        { key: 'order_code', label: 'Mã đơn hàng', className: 'w-[180px]' },
        { key: 'customer', label: 'Khách hàng', className: 'w-[20%]' },
        { key: 'total_amount', label: 'Tổng tiền', className: 'text-right' },
        { key: 'order_status', label: 'Trạng thái đơn', className: 'text-center' },
        { key: 'payment_status', label: 'Thanh toán', className: 'text-center' },
        { key: 'created_at', label: 'Ngày đặt', className: 'text-center' },
        { key: 'actions', label: 'Thao tác', className: 'w-[80px] text-center' },
    ],
}

const TableRowComponent = React.memo(({
    item
}: {
    item: Order
}) => {
    const status = ORDER_STATUSES[item.order_status] || { label: item.order_status, color: 'bg-gray-100', icon: AlertCircle };
    const payStatus = PAYMENT_STATUSES[item.payment_status] || { label: item.payment_status, color: 'bg-gray-100' };
    const StatusIcon = status.icon;

    return (
        <TableRow key={item.id} className="cursor-pointer">
            <TableCell>{item.id}</TableCell>
            <TableCell className="font-bold text-blue-600 uppercase tracking-wider">
                <Link href={`/backend/order/${item.id}`} className="hover:underline">
                    {item.order_code}
                </Link>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{item.customer_name}</span>
                    <span className="text-[11px] text-gray-400">{item.customer_phone}</span>
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
            <TableCell className="text-center text-gray-500 text-xs">
                {new Date(item.created_at).toLocaleDateString('vi-VN')}
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center">
                    <Link href={`/backend/order/${item.id}`}>
                        <Button type='button' className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]">
                            <Eye size={14} />
                        </Button>
                    </Link>
                </div>
            </TableCell>
        </TableRow>
    )
})

export default function OrderIndex({ records }: { records: IPaginate<Order> }) {
    
    // Thêm các bộ lọc "Tất cả" theo yêu cầu người dùng
    const orderStatusOptions = [
        { value: '0', label: 'Tất cả trạng thái' },
        ...Object.entries(ORDER_STATUSES).map(([value, info]) => ({ value, label: info.label }))
    ];

    const paymentStatusOptions = [
        { value: '0', label: 'Tất cả thanh toán' },
        ...Object.entries(PAYMENT_STATUSES).map(([value, info]) => ({ value, label: info.label }))
    ];

    const { filters } = useFilter({ 
        defaultFilters: [
            {
                key: 'order_status',
                type: 'single',
                placeholder: 'Trạng thái đơn',
                options: orderStatusOptions
            },
            {
                key: 'payment_status',
                type: 'single',
                placeholder: 'Thanh toán',
                options: paymentStatusOptions
            }
        ] 
    });

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
                                <CustomFilter filters={filters} />
                            </div>
                        </div>

                        <CustomActiveFilters filters={filters} />

                        <CustomTable 
                            data={records.data}
                            columns={(pageConfig.columns ?? [])}
                            render={(item: Order) => 
                                <TableRowComponent 
                                    key={item.id}
                                    item={item}
                                />
                            }
                        />
                        
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}
