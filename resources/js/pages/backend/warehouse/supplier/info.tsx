import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit2, Package, RotateCcw, ChevronDown, Info } from 'lucide-react';
import CustomPagination from '@/components/custom-pagination';
import { Supplier } from './save';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subWeeks, subMonths, startOfYear, subYears } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { PriceInput } from '@/components/price-input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ImportOrder {
    id: number;
    code: string | null;
    created_at: string;
    total_amount: number;
    amount_to_pay: number;
    payment_amount: number;
    payment_status: string;
    status: string;
    type?: 'import' | 'return';
}

interface UnpaidOrder {
    id: number;
    code: string | null;
    created_at: string;
    amount_to_pay: number;
    payment_amount: number;
    remaining_debt: number;
    type: 'import' | 'return';
}

interface PaymentHistory {
    id: number;
    order_id: number;
    order_code: string;
    amount: number;
    total_amount: number;
    payment_date: string;
    note: string;
    type: 'payment' | 'refund';
    payment_details?: Array<{
        date: string;
        amount: number;
        note: string;
    }>;
}

interface RefundHistory extends PaymentHistory {
    original_amount?: number; // Tổng tiền gốc
    discount?: number; // Giảm giá
    deduction?: number; // Giảm trừ
    deduction_reason?: string;
    return_cost?: number; // Chi phí trả hàng
}

interface SupplierInfoProps {
    supplier: Supplier;
    totalDebt: number;
    totalPaid: number;
    currentDebt: number;
    importHistory: IPaginate<ImportOrder>;
    stats?: {
        importOrderCount: number;
        importOrderTotalRaw: number;
        importOrderDiscount: number;
        importOrderCost: number; // Chi phí nhập hàng
        importOrderTotal: number;
        unpaidImportCount: number;
        unpaidImportTotalToPay: number;
        unpaidImportPaid: number;
        unpaidImportTotal: number;
        returnOrderCount: number;
        returnOrderTotalRaw: number;
        returnOrderDiscount: number;
        returnOrderDeduction: number;
        returnOrderTotal: number;
        unpaidReturnCount: number;
        unpaidReturnTotalRaw: number;
        unpaidReturnDiscount: number;
        unpaidReturnDeduction: number;
        unpaidReturnTotal: number;
    };
    unpaidOrders?: UnpaidOrder[];
    paymentHistory?: PaymentHistory[];
    refundHistory?: RefundHistory[];
    users?: Array<{ id: number; name: string }>;
    dateFrom?: string;
    dateTo?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý nhà cung cấp',
        href: '/backend/supplier',
    },
    {
        title: 'Thông tin nhà cung cấp',
        href: '/',
    }
];

type DateFilterOption = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'lastWeek' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'lastYear' | 'thisYear' | 'custom';

const dateFilterLabels: Record<DateFilterOption, string> = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    last7days: '7 ngày qua',
    last30days: '30 ngày qua',
    lastWeek: 'Tuần trước',
    thisWeek: 'Tuần này',
    lastMonth: 'Tháng trước',
    thisMonth: 'Tháng này',
    lastYear: 'Năm trước',
    thisYear: 'Năm nay',
    custom: 'Tùy chọn',
};

const getDateRange = (filter: DateFilterOption): { from: Date; to: Date } => {
    const now = new Date();
    switch (filter) {
        case 'today':
            return { from: now, to: now };
        case 'yesterday':
            return { from: subDays(now, 1), to: subDays(now, 1) };
        case 'last7days':
            return { from: subDays(now, 7), to: now };
        case 'last30days':
            return { from: subDays(now, 30), to: now };
        case 'lastWeek':
            return { from: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) };
        case 'thisWeek':
            return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'lastMonth':
            return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
        case 'thisMonth':
            return { from: startOfMonth(now), to: endOfMonth(now) };
        case 'lastYear':
            return { from: startOfYear(subYears(now, 1)), to: new Date(now.getFullYear() - 1, 11, 31) };
        case 'thisYear':
            return { from: startOfYear(now), to: now };
        default:
            return { from: startOfMonth(now), to: endOfMonth(now) };
    }
};

export default function SupplierInfo({
    supplier,
    totalDebt,
    totalPaid,
    currentDebt,
    importHistory,
    stats,
    unpaidOrders = [],
    paymentHistory = [],
    refundHistory = [],
    users = [],
    dateFrom,
    dateTo
}: SupplierInfoProps) {
    const [responsibleUserId, setResponsibleUserId] = useState<string>(
        supplier.responsible_user_id?.toString() || ''
    );
    const [dateFilter, setDateFilter] = useState<DateFilterOption>('thisMonth');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [debtTab, setDebtTab] = useState('unpaid');

    // Payment dialog state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<UnpaidOrder | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number | undefined>(undefined);
    const [paymentNote, setPaymentNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0đ';
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    };

    const formatDateTime = (date: string | null | undefined) => {
        if (!date) return '-';
        try {
            return format(new Date(date), 'dd/MM/yyyy HH:mm');
        } catch {
            return date;
        }
    };

    const formatDateShort = (date: string | null | undefined) => {
        if (!date) return '-';
        try {
            return format(new Date(date), 'dd-MM-yyyy');
        } catch {
            return date;
        }
    };

    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            'draft': { label: 'Nháp', className: 'bg-gray-100 text-gray-600 border-gray-200' },
            'pending': { label: 'Chưa nhập', className: 'bg-orange-50 text-orange-600 border-orange-200' },
            'completed': { label: 'Đã nhập', className: 'bg-blue-50 text-blue-600 border-blue-200' },
            'cancelled': { label: 'Đã hủy', className: 'bg-red-50 text-red-600 border-red-200' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
    };

    const getPaymentStatusBadge = (order: ImportOrder) => {
        const paid = order.payment_amount || 0;
        const total = order.amount_to_pay || 0;

        if (order.type === 'return') {
            if (order.payment_status === 'refunded' || paid >= total) {
                return { label: 'Đã nhận hoàn tiền', className: 'bg-green-50 text-green-600 border-green-200' };
            } else if (paid > 0) {
                return { label: 'Hoàn tiền một phần', className: 'bg-blue-50 text-blue-600 border-blue-200' };
            }
            return { label: 'Chưa hoàn tiền', className: 'bg-gray-100 text-gray-600 border-gray-200' };
        }

        if (paid >= total && total > 0) {
            return { label: 'Đã thanh toán', className: 'bg-green-50 text-green-600 border-green-200' };
        } else if (paid > 0 && paid < total) {
            return { label: 'Thanh toán một phần', className: 'bg-blue-50 text-blue-600 border-blue-200' };
        } else {
            return { label: 'Chưa thanh toán', className: 'bg-gray-100 text-gray-600 border-gray-200' };
        }
    };

    const handleResponsibleUserChange = (value: string) => {
        setResponsibleUserId(value);
        // Cập nhật nhân viên phụ trách cho NCC (dùng PATCH để chỉ update field này)
        router.patch(`/backend/supplier/${supplier.id}`, {
            responsible_user_id: value ? parseInt(value) : null,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDateFilterApply = (filter: DateFilterOption) => {
        setDateFilter(filter);
        const range = getDateRange(filter);
        router.get(`/backend/supplier/${supplier.id}/info`, {
            date_from: format(range.from, 'yyyy-MM-dd'),
            date_to: format(range.to, 'yyyy-MM-dd'),
        }, {
            preserveState: true,
            preserveScroll: true,
        });
        setIsDropdownOpen(false);
    };

    const openPaymentDialog = (order: UnpaidOrder) => {
        setSelectedOrder(order);
        setPaymentAmount(undefined); // Không pre-fill, để user gõ hoặc click badge
        setPaymentNote('');
        setPaymentDialogOpen(true);
    };

    const handlePaymentSubmit = () => {
        if (!selectedOrder || !paymentAmount) return;

        setIsSubmitting(true);

        const endpoint = selectedOrder.type === 'return'
            ? `/backend/return-import-order/${selectedOrder.id}/confirm-refund`
            : `/backend/import-order/${selectedOrder.id}/payment`;

        router.post(endpoint, {
            amount: paymentAmount,
            note: paymentNote,
        }, {
            onSuccess: () => {
                setPaymentDialogOpen(false);
                setSelectedOrder(null);
                setPaymentAmount(undefined);
                setPaymentNote('');
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const displayDateRange = dateFrom && dateTo
        ? `${format(new Date(dateFrom), 'dd/MM/yyyy')} - ${format(new Date(dateTo), 'dd/MM/yyyy')}`
        : `${format(startOfMonth(new Date()), 'dd/MM/yyyy')} - ${format(endOfMonth(new Date()), 'dd/MM/yyyy')}`;

    // Separate unpaid orders by type
    const unpaidImportOrders = unpaidOrders.filter(o => o.type === 'import');
    const unpaidReturnOrders = unpaidOrders.filter(o => o.type === 'return');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Thông tin nhà cung cấp - ${supplier.name}`} />
            <div className="flex h-full flex-1 flex-col gap-0 overflow-x-auto rounded-xl page-wrapper">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4">
                    <div className="max-w-[1100px] ml-auto mr-auto flex items-center gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => router.get('/backend/supplier')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-semibold">{supplier.name}</h1>
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {supplier.publish === '2' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Supplier Code & Stats Block */}
                <div className="bg-white border-b px-6 py-4">
                    <div className="max-w-[1100px] ml-auto mr-auto">
                        {/* Row 1: Code & Date Filter */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium">
                                Mã nhà cung cấp: <span className="font-bold">{supplier.code}</span>
                            </span>
                            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="text-sm">
                                        {dateFilterLabels[dateFilter]} ({displayDateRange})
                                        <ChevronDown className="w-4 h-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-[320px] p-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        {(Object.keys(dateFilterLabels) as DateFilterOption[]).map((key) => (
                                            <Button
                                                key={key}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDateFilterApply(key)}
                                                className={`justify-center ${dateFilter === key ? 'border-blue-500 text-blue-600 bg-blue-50' : ''}`}
                                            >
                                                {dateFilterLabels[key]}
                                            </Button>
                                        ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Row 2: Stats Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="bg-gray-50 rounded-[5px] p-3 border cursor-help">
                                            <p className="text-xs text-gray-500">Đơn nhập</p>
                                            <p className="text-xs text-gray-500">đã tạo</p>
                                            <p className="text-blue-600 font-semibold mt-1">{stats?.importOrderCount || 0} đơn</p>
                                            <p className="text-xs text-gray-600 underline decoration-dotted">{formatCurrency(stats?.importOrderTotal || 0)}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="p-3 bg-gray-900 text-white">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between gap-4">
                                                <span>Tổng giá trị đơn:</span>
                                                <span className="font-medium">{formatCurrency(stats?.importOrderTotalRaw || 0)}</span>
                                            </div>
                                            {(stats?.importOrderDiscount || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-red-300">
                                                    <span>- Giảm giá/KM:</span>
                                                    <span>-{formatCurrency(stats?.importOrderDiscount || 0)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700 font-semibold text-green-300">
                                                <span>= Cần trả NCC:</span>
                                                <span>{formatCurrency(stats?.importOrderTotal || 0)}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {/* Card 2: Đơn đã nhập chưa thanh toán */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="bg-gray-50 rounded-[5px] p-3 border cursor-help">
                                            <p className="text-xs text-gray-500">Đơn đã nhập</p>
                                            <p className="text-xs text-gray-500">chưa thanh toán</p>
                                            <p className="text-blue-600 font-semibold mt-1">{stats?.unpaidImportCount || 0} đơn</p>
                                            <p className="text-xs text-gray-600 underline decoration-dotted">{formatCurrency(stats?.unpaidImportTotal || 0)}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="p-3 bg-gray-900 text-white">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between gap-4">
                                                <span>Tổng cần thanh toán:</span>
                                                <span className="font-medium">{formatCurrency(stats?.unpaidImportTotalToPay || 0)}</span>
                                            </div>
                                            {(stats?.unpaidImportPaid || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-green-300">
                                                    <span>- Đã thanh toán:</span>
                                                    <span>-{formatCurrency(stats?.unpaidImportPaid || 0)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700 font-semibold text-red-300">
                                                <span>= Còn lại:</span>
                                                <span>{formatCurrency(stats?.unpaidImportTotal || 0)}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {/* Card 3: Đơn trả đã tạo */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="bg-gray-50 rounded-[5px] p-3 border cursor-help">
                                            <p className="text-xs text-gray-500">Đơn Trả</p>
                                            <p className="text-xs text-gray-500">đã tạo</p>
                                            <p className="text-red-600 font-semibold mt-1">{stats?.returnOrderCount || 0} đơn</p>
                                            <p className="text-xs text-gray-600 underline decoration-dotted">{formatCurrency(stats?.returnOrderTotal || 0)}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="p-3 bg-gray-900 text-white">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between gap-4">
                                                <span>Tổng giá trị hàng trả:</span>
                                                <span className="font-medium">{formatCurrency(stats?.returnOrderTotalRaw || 0)}</span>
                                            </div>
                                            {(stats?.returnOrderDiscount || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-red-300">
                                                    <span>- Giảm giá:</span>
                                                    <span>-{formatCurrency(stats?.returnOrderDiscount || 0)}</span>
                                                </div>
                                            )}
                                            {(stats?.returnOrderDeduction || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-red-300">
                                                    <span>- Giảm trừ:</span>
                                                    <span>-{formatCurrency(stats?.returnOrderDeduction || 0)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700 font-semibold text-green-300">
                                                <span>= Thực tế cần hoàn:</span>
                                                <span>{formatCurrency(stats?.returnOrderTotal || 0)}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            {/* Card 4: Đơn trả chưa nhận hoàn tiền */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="bg-gray-50 rounded-[5px] p-3 border cursor-help">
                                            <p className="text-xs text-gray-500">Đơn trả</p>
                                            <p className="text-xs text-gray-500">chưa nhận hoàn tiền</p>
                                            <p className="text-red-600 font-semibold mt-1">{stats?.unpaidReturnCount || 0} đơn</p>
                                            <p className="text-xs text-gray-600 underline decoration-dotted">{formatCurrency(stats?.unpaidReturnTotal || 0)}</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="p-3 bg-gray-900 text-white">
                                        <div className="space-y-1 text-xs">
                                            <div className="flex justify-between gap-4">
                                                <span>Tổng giá trị hàng trả:</span>
                                                <span className="font-medium">{formatCurrency(stats?.unpaidReturnTotalRaw || 0)}</span>
                                            </div>
                                            {(stats?.unpaidReturnDiscount || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-red-300">
                                                    <span>- Giảm giá:</span>
                                                    <span>-{formatCurrency(stats?.unpaidReturnDiscount || 0)}</span>
                                                </div>
                                            )}
                                            {(stats?.unpaidReturnDeduction || 0) > 0 && (
                                                <div className="flex justify-between gap-4 text-red-300">
                                                    <span>- Giảm trừ:</span>
                                                    <span>-{formatCurrency(stats?.unpaidReturnDeduction || 0)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700 font-semibold text-orange-300">
                                                <span>= Chờ hoàn:</span>
                                                <span>{formatCurrency(stats?.unpaidReturnTotal || 0)}</span>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="page-container py-6">
                    <div className="max-w-[1100px] ml-auto mr-auto">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Left Side - Import/Return History + Debt Management */}
                            <div className="col-span-2 space-y-6">
                                {/* Import/Return History */}
                                <Card className="rounded-[5px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-medium">Lịch sử nhập/trả hàng</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="divide-y">
                                            {importHistory?.data && importHistory.data.length > 0 ? (
                                                importHistory.data.map((order) => {
                                                    const isReturn = order.type === 'return';
                                                    const status = getStatusBadge(order.status);
                                                    const paymentStatus = getPaymentStatusBadge(order);

                                                    return (
                                                        <div key={`${order.type}-${order.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center ${isReturn ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                                    {isReturn ? (
                                                                        <RotateCcw className="w-4 h-4 text-red-600" />
                                                                    ) : (
                                                                        <Package className="w-4 h-4 text-blue-600" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm">
                                                                        {isReturn ? 'Đơn trả' : 'Đơn nhập'}{' '}
                                                                        <Link
                                                                            href={`/backend/${isReturn ? 'return-import-order' : 'import-order'}/${order.id}${order.status === 'completed' ? '' : '/edit'}`}
                                                                            className="text-blue-600 hover:underline font-medium"
                                                                        >
                                                                            {order.code || `#${order.id}`}
                                                                        </Link>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">{formatDateShort(order.created_at)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="outline" className={`text-xs rounded-[5px] ${status.className}`}>
                                                                    {isReturn ? 'Đã hoàn trả' : status.label}
                                                                </Badge>
                                                                <div className="flex items-center gap-1">
                                                                    <Badge variant="outline" className={`text-xs rounded-[5px] ${paymentStatus.className}`}>
                                                                        {paymentStatus.label}
                                                                    </Badge>
                                                                    {/* Info icon for orders with payment details (1 or more payments) */}
                                                                    {!isReturn && (order as any).payment_details && (order as any).payment_details.length > 0 && (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-blue-500" />
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="left" className="p-3 bg-gray-900 text-white max-w-xs">
                                                                                    <div className="space-y-2 text-xs">
                                                                                        <p className="font-medium border-b border-gray-700 pb-1">
                                                                                            {(order as any).payment_details.length > 1 
                                                                                                ? `Chi tiết ${(order as any).payment_details.length} lần thanh toán:`
                                                                                                : 'Chi tiết thanh toán:'}
                                                                                        </p>
                                                                                        {(order as any).payment_details.map((p: any, idx: number) => (
                                                                                            <div key={idx} className="flex justify-between gap-3">
                                                                                                <span className="text-gray-400">{p.date}</span>
                                                                                                <span className="text-green-300">{formatCurrency(p.amount)}</span>
                                                                                                {p.note && (
                                                                                                    <span className="text-gray-500 text-[10px] ml-2">({p.note})</span>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                        <div className="flex justify-between gap-3 pt-1 border-t border-gray-700 font-semibold">
                                                                                            <span>Tổng cộng:</span>
                                                                                            <span className="text-green-300">{formatCurrency(order.payment_amount || 0)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm font-medium min-w-[90px] text-right">
                                                                    {formatCurrency(order.amount_to_pay || order.total_amount)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="px-4 py-8 text-center text-gray-500">
                                                    Không có dữ liệu
                                                </div>
                                            )}
                                        </div>

                                        {importHistory?.links && importHistory.links.length > 0 && (
                                            <div className="px-4 py-3 border-t">
                                                <CustomPagination
                                                    links={importHistory.links}
                                                    currentPage={importHistory.current_page || 1}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Quản lý công nợ with Tabs */}
                                <Card className="rounded-[5px]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-medium">Quản lý công nợ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 pt-2">
                                        <Tabs value={debtTab} onValueChange={setDebtTab} className="w-full">
                                            <div className="px-4">
                                                <TabsList className="flex-wrap h-auto">
                                                    <TabsTrigger value="unpaid">
                                                        Chưa thanh toán
                                                    </TabsTrigger>
                                                    <TabsTrigger value="unpaid_refund">
                                                        Chưa hoàn tiền
                                                    </TabsTrigger>
                                                    <TabsTrigger value="payment_history">
                                                        Lịch sử thanh toán
                                                    </TabsTrigger>
                                                    <TabsTrigger value="refund_history">
                                                        Lịch sử hoàn tiền
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <TabsContent value="unpaid" className="m-0">
                                                {/* Summary for unpaid import orders */}
                                                <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Tổng tiền nhập</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(unpaidImportOrders.reduce((sum, o) => sum + Number(o.amount_to_pay || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Đã thanh toán</p>
                                                        <p className="text-sm font-semibold text-green-600">
                                                            {formatCurrency(unpaidImportOrders.reduce((sum, o) => sum + Number(o.payment_amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Còn nợ NCC</p>
                                                        <p className="text-sm font-semibold text-red-600">
                                                            {formatCurrency(unpaidImportOrders.reduce((sum, o) => sum + Number(o.remaining_debt || 0), 0))}
                                                        </p>
                                                    </div>
                                                </div>
                                                {unpaidImportOrders.length > 0 ? (
                                                    <div className="divide-y">
                                                        {unpaidImportOrders.map((order) => (
                                                            <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                                                <div>
                                                                    <p className="text-sm">
                                                                        Đơn nhập{' '}
                                                                        <Link
                                                                            href={`/backend/import-order/${order.id}/edit`}
                                                                            className="text-blue-600 hover:underline font-medium"
                                                                        >
                                                                            {order.code || `#${order.id}`}
                                                                        </Link>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Còn nợ: <span className="text-red-600 font-medium">{formatCurrency(order.remaining_debt)}</span>
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-[5px]"
                                                                    onClick={() => openPaymentDialog(order)}
                                                                >
                                                                    Thanh toán
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        Không có đơn hàng cần thanh toán
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="unpaid_refund" className="m-0">
                                                {/* Summary for unpaid return orders */}
                                                <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Tổng tiền cần hoàn</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(unpaidReturnOrders.reduce((sum, o) => sum + Number(o.amount_to_pay || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Đã nhận hoàn</p>
                                                        <p className="text-sm font-semibold text-green-600">
                                                            {formatCurrency(unpaidReturnOrders.reduce((sum, o) => sum + Number(o.payment_amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Chờ hoàn từ NCC</p>
                                                        <p className="text-sm font-semibold text-orange-600">
                                                            {formatCurrency(unpaidReturnOrders.reduce((sum, o) => sum + Number(o.remaining_debt || 0), 0))}
                                                        </p>
                                                    </div>
                                                </div>
                                                {unpaidReturnOrders.length > 0 ? (
                                                    <div className="divide-y">
                                                        {unpaidReturnOrders.map((order) => (
                                                            <Link
                                                                key={order.id}
                                                                href={`/backend/return-import-order/${order.id}`}
                                                                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                                                            >
                                                                <div>
                                                                    <p className="text-sm">
                                                                        Đơn trả{' '}
                                                                        <span className="text-blue-600 font-medium">
                                                                            {order.code || `#${order.id}`}
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Chờ hoàn: <span className="text-orange-600 font-medium">{formatCurrency(order.remaining_debt)}</span>
                                                                    </p>
                                                                </div>
                                                                <span className="text-xs text-gray-400">Xem chi tiết →</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        Không có đơn trả cần hoàn tiền
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="payment_history" className="m-0">
                                                {/* Summary for payment history */}
                                                <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Số đơn đã TT</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {paymentHistory.length} đơn
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Tổng giá trị đơn</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(paymentHistory.reduce((sum, o) => sum + Number(o.total_amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Đã thanh toán</p>
                                                        <p className="text-sm font-semibold text-green-600">
                                                            {formatCurrency(paymentHistory.reduce((sum, o) => sum + Number(o.amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                </div>
                                                {paymentHistory.length > 0 ? (
                                                    <div className="divide-y">
                                                        {paymentHistory.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                                                <div>
                                                                    <p className="text-sm">
                                                                        Đơn nhập{' '}
                                                                        <Link
                                                                            href={`/backend/import-order/${item.order_id}`}
                                                                            className="text-blue-600 hover:underline font-medium"
                                                                        >
                                                                            {item.order_code}
                                                                        </Link>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">{formatDateTime(item.payment_date)}</p>
                                                                    {item.note && <p className="text-xs text-gray-400 mt-1">{item.note}</p>}
                                                                </div>
                                                                <div className="text-right flex items-center gap-1">
                                                                    <span className="text-sm font-medium text-green-600">
                                                                        Đã TT: {formatCurrency(item.amount)}
                                                                    </span>
                                                                    {/* Info icon for orders with payment details (1 or more payments) */}
                                                                    {(item.payment_details?.length || 0) > 0 && (
                                                                        <TooltipProvider>
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help hover:text-blue-500" />
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="left" className="p-3 bg-gray-900 text-white max-w-xs">
                                                                                    <div className="space-y-2 text-xs">
                                                                                        <p className="font-medium border-b border-gray-700 pb-1">
                                                                                            {(item.payment_details?.length || 0) > 1 
                                                                                                ? `Chi tiết ${item.payment_details.length} lần thanh toán:`
                                                                                                : 'Chi tiết thanh toán:'}
                                                                                        </p>
                                                                                        {item.payment_details?.map((p: any, idx: number) => (
                                                                                            <div key={idx} className="flex justify-between gap-3">
                                                                                                <span className="text-gray-400">{p.date}</span>
                                                                                                <span className="text-green-300">{formatCurrency(p.amount)}</span>
                                                                                                {p.note && (
                                                                                                    <span className="text-gray-500 text-[10px] ml-2">({p.note})</span>
                                                                                                )}
                                                                                            </div>
                                                                                        ))}
                                                                                        <div className="flex justify-between gap-3 pt-1 border-t border-gray-700 font-semibold">
                                                                                            <span>Tổng cộng:</span>
                                                                                            <span className="text-green-300">{formatCurrency(item.amount)}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )}
                                                                    <p className="text-xs text-gray-500">
                                                                        / {formatCurrency(item.total_amount)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        Chưa có lịch sử thanh toán
                                                    </div>
                                                )}
                                            </TabsContent>

                                            <TabsContent value="refund_history" className="m-0">
                                                {/* Summary for refund history */}
                                                <div className="px-4 py-3 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Số đơn đã hoàn</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {refundHistory.length} đơn
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Tổng tiền cần hoàn</p>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {formatCurrency(refundHistory.reduce((sum, o) => sum + Number(o.total_amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Đã nhận hoàn</p>
                                                        <p className="text-sm font-semibold text-orange-600">
                                                            {formatCurrency(refundHistory.reduce((sum, o) => sum + Number(o.amount || 0), 0))}
                                                        </p>
                                                    </div>
                                                </div>
                                                {refundHistory.length > 0 ? (
                                                    <div className="divide-y">
                                                        {refundHistory.map((item) => (
                                                            <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                                                <div>
                                                                    <p className="text-sm">
                                                                        Đơn trả{' '}
                                                                        <Link
                                                                            href={`/backend/return-import-order/${item.order_id}`}
                                                                            className="text-blue-600 hover:underline font-medium"
                                                                        >
                                                                            {item.order_code}
                                                                        </Link>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">{formatDateTime(item.payment_date)}</p>
                                                                    {item.note && <p className="text-xs text-gray-400 mt-1">{item.note}</p>}
                                                                </div>
                                                                <div className="text-right">
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-sm font-medium text-orange-600 cursor-help underline decoration-dotted">
                                                                                    Đã hoàn: {formatCurrency(item.amount)}
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="max-w-xs p-3 bg-gray-900 text-white">
                                                                                {(() => {
                                                                                    const totalAmount = Number(item.total_amount) || 0;
                                                                                    const actualRefund = Number(item.amount) || 0;
                                                                                    const discount = Number(item.discount) || 0;
                                                                                    const deduction = Number(item.deduction) || 0;
                                                                                    // Chi phí trả hàng không tính vào công thức hoàn tiền (mình tự chịu)

                                                                                    // Tính toán chênh lệch chưa được giải thích
                                                                                    const explainedDeductions = discount + deduction;
                                                                                    const totalDifference = totalAmount - actualRefund;
                                                                                    const unexplainedDifference = totalDifference - explainedDeductions;

                                                                                    return (
                                                                                        <div className="space-y-1 text-xs">
                                                                                            <div className="flex justify-between gap-4">
                                                                                                <span>Tổng giá trị hàng trả:</span>
                                                                                                <span className="font-medium">{formatCurrency(totalAmount)}</span>
                                                                                            </div>
                                                                                            {discount > 0 && (
                                                                                                <div className="flex justify-between gap-4 text-red-300">
                                                                                                    <span>- Giảm giá:</span>
                                                                                                    <span>-{formatCurrency(discount)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {deduction > 0 && (
                                                                                                <div className="flex justify-between gap-4 text-red-300">
                                                                                                    <span>- Giảm trừ{item.deduction_reason ? ` (${item.deduction_reason})` : ''}:</span>
                                                                                                    <span>-{formatCurrency(deduction)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {unexplainedDifference > 0 && (
                                                                                                <div className="flex justify-between gap-4 text-yellow-300">
                                                                                                    <span>- Khác (chênh lệch):</span>
                                                                                                    <span>-{formatCurrency(unexplainedDifference)}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            <div className="flex justify-between gap-4 pt-1 border-t border-gray-700 font-semibold text-green-300">
                                                                                                <span>= Thực nhận:</span>
                                                                                                <span>{formatCurrency(actualRefund)}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                    <p className="text-xs text-gray-500">
                                                                        / {formatCurrency(item.total_amount)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        Chưa có lịch sử hoàn tiền
                                                    </div>
                                                )}
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Sidebar */}
                            <div className="space-y-6">
                                {/* Contact Info */}
                                <Card className="rounded-[5px]">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-medium">Liên hệ</CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => router.get(`/backend/supplier/${supplier.id}/edit`)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p className="text-gray-700">{supplier.phone || 'Không có số điện thoại'}</p>
                                        <p className="text-gray-700">{supplier.email || 'Không có email'}</p>
                                        <p className="text-gray-700">{supplier.address || 'Không có địa chỉ'}</p>
                                    </CardContent>
                                </Card>

                                {/* Responsible User */}
                                <Card className="rounded-[5px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-medium">Nhân viên phụ trách</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Select value={responsibleUserId} onValueChange={handleResponsibleUserChange}>
                                            <SelectTrigger className="w-full rounded-[5px]">
                                                <SelectValue placeholder="Chọn nhân viên" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map(user => (
                                                    <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                {/* Thống kê công nợ */}
                                <Card className="rounded-[5px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base font-medium">Thống kê công nợ</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Tổng công nợ</span>
                                            <span className="font-bold text-blue-600">{formatCurrency(totalDebt)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Đã thanh toán</span>
                                            <span className="font-bold text-green-600">{formatCurrency(totalPaid)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t">
                                            <span className="text-sm text-gray-500">Còn nợ</span>
                                            <span className="font-bold text-red-600">{formatCurrency(currentDebt)}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment/Refund Dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedOrder?.type === 'return' ? 'Hoàn tiền' : 'Thanh toán'} - {selectedOrder?.code}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Số tiền còn lại</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(selectedOrder?.remaining_debt)}</p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium">Số tiền {selectedOrder?.type === 'return' ? 'hoàn' : 'thanh toán'}</label>
                                <Badge
                                    variant="outline"
                                    className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors text-xs"
                                    onClick={() => setPaymentAmount(selectedOrder?.remaining_debt)}
                                >
                                    Thanh toán đủ: {formatCurrency(selectedOrder?.remaining_debt)}
                                </Badge>
                            </div>
                            <PriceInput
                                value={paymentAmount}
                                onValueChange={(val) => setPaymentAmount(val)}
                                placeholder="Nhập số tiền"
                                className="rounded-[5px]"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Ghi chú</label>
                            <Input
                                value={paymentNote}
                                onChange={(e) => setPaymentNote(e.target.value)}
                                placeholder="Ghi chú (không bắt buộc)"
                                className="mt-1 rounded-[5px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="rounded-[5px]">
                            Hủy
                        </Button>
                        <Button
                            onClick={handlePaymentSubmit}
                            disabled={isSubmitting || !paymentAmount}
                            className="rounded-[5px]"
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
