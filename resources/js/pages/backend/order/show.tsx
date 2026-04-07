
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { BreadcrumbItem } from '@/types';
import { Head, useForm, Link } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { 
    Clock, Package, Truck, CheckCircle2, XCircle, 
    CreditCard, User, Mail, Phone, MapPin, 
    ChevronLeft, Save, AlertCircle, ShoppingCart, 
    Calendar as CalendarIcon, Info, Receipt, Wallet
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface OrderItem {
    id: number;
    product_id: number;
    variant_id: number | null;
    product_name: string;
    variant_name?: string;
    product_image?: string;
    variant_image?: string;
    quantity: number;
    price: number | string;
    total: number | string;
    type: string;
    combo_group_id?: string;
    promotions_snapshot?: any;
    product?: {
        image?: string;
    };
    variant?: {
        image?: string;
    };
}

interface Order {
    id: number;
    order_code: string;
    customer_id: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    shipping_address: string;
    total_amount: number | string;
    subtotal: number | string;
    shipping_fee: number;
    discount_total: number;
    voucher_discount: number;
    summary_snapshot?: any;
    order_status: string;
    payment_status: string;
    payment_method_id: number;
    notes?: string;
    created_at: string;
    order_items: OrderItem[];
    payment_method?: {
        name: string;
    }
}

const ORDER_STATUSES = [
    { value: 'pending', label: 'Chờ xử lý', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock },
    { value: 'processing', label: 'Đang chuẩn bị', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Package },
    { value: 'shipping', label: 'Đang giao hàng', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Truck },
    { value: 'completed', label: 'Hoàn thành', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
];

const PAYMENT_STATUSES = [
    { value: 'unpaid', label: 'Chưa thanh toán', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'paid', label: 'Đã thanh toán', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'failed', label: 'Thanh toán lỗi', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'refunded', label: 'Đã hoàn tiền', color: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
};

export default function OrderShow({ record, cashReasons = [] }: { record: Order, cashReasons: any[] }) {
    const { data, setData, put, processing } = useForm({
        order_status: record.order_status,
        payment_status: record.payment_status,
        notes: record.notes || '',
        create_receipt: false,
        receipt_reason_id: cashReasons.find(r => r.is_default)?.id?.toString() || (cashReasons[0]?.id?.toString() || ''),
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Quản lý đơn hàng', href: '/backend/order' },
        { title: `Đơn hàng ${record.order_code}`, href: '#' }
    ];

    const currentStatus = ORDER_STATUSES.find(s => s.value === record.order_status) || ORDER_STATUSES[0];
    const StatusIcon = currentStatus.icon;

    // Phân nhóm sản phẩm theo Combo/Quà tặng tương tự phần giỏ hàng
    const groupedItems = useMemo(() => {
        const result: any[] = [];
        const combos: Record<string, any> = {};

        record.order_items.forEach(item => {
            if (item.type === 'combo_item' && item.combo_group_id) {
                const gid = item.combo_group_id;
                if (!combos[gid]) {
                    // Lấy snapshot thông tin combo nếu có
                    const comboInfo = item.promotions_snapshot?.combo_snapshot || {};
                    combos[gid] = {
                        is_combo: true,
                        combo_group_id: gid,
                        name: comboInfo.combo_name || 'Gói sản phẩm Combo',
                        image: comboInfo.combo_image || null,
                        items: [],
                        total: 0
                    };
                    result.push(combos[gid]);
                }
                combos[gid].items.push(item);
                combos[gid].total += Number(item.total);
            } else if (item.type === 'reward' || item.type === 'gift') {
                result.push({ ...item, is_reward: true });
            } else {
                result.push({ ...item, is_standard: true });
            }
        });

        return result;
    }, [record.order_items]);

    const itemsSubtotal = useMemo(() => {
        return record.order_items.reduce((sum, item) => sum + Number(item.total), 0);
    }, [record.order_items]);

    const additionalDiscount = useMemo(() => {
        const snap = record.summary_snapshot || {};
        return (Number(snap.order_discount || 0) + Number(snap.voucher_discount || record.voucher_discount || 0));
    }, [record.summary_snapshot, record.voucher_discount]);

    const handleUpdate = () => {
        put(`/backend/order/${record.id}`, {
            onSuccess: () => toast.success('Cập nhật đơn hàng thành công'),
            onError: () => toast.error('Có lỗi xảy ra khi cập nhật')
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Đơn hàng ${record.order_code}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper bg-[#fbfbfb]">
                <CustomPageHeading 
                    heading={`Chi tiết đơn hàng #${record.order_code}`}
                    breadcrumbs={breadcrumbs}
                    action={
                        <Link href="/backend/order">
                            <Button variant="outline" className="rounded-[5px] gap-2 h-9 text-xs">
                                <ChevronLeft size={14} />
                                Quay lại
                            </Button>
                        </Link>
                    }
                />

                <div className="page-container pb-10">
                    <div className="max-w-[1100px] mx-auto w-full">
                        
                        {/* Header Status Bar */}
                        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="text-sm font-medium text-gray-500">
                                    Ngày đặt: <span className="text-gray-900 ml-1">{new Date(record.created_at).toLocaleString('vi-VN')}</span>
                                </div>
                                <Badge variant="outline" className={`rounded-full px-3 py-1 font-medium border ${currentStatus.color}`}>
                                    <StatusIcon size={14} className="mr-1.5" />
                                    {currentStatus.label}
                                </Badge>
                                <Badge variant="outline" className={`rounded-full px-3 py-1 font-medium border ${PAYMENT_STATUSES.find(s => s.value === record.payment_status)?.color}`}>
                                    {PAYMENT_STATUSES.find(s => s.value === record.payment_status)?.label}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs font-medium">In hóa đơn</Button>
                                <Button variant="outline" size="sm" className="h-8 text-xs font-medium">Gửi email</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* LEFT COLUMN: Items & Summary */}
                            <div className="lg:col-span-2 space-y-6">
                                
                                {/* Order Content Section */}
                                <CustomCard title="Sản phẩm & Dịch vụ" isShowHeader={true} className="overflow-hidden">
                                    <div className="p-0">
                                        <Table>
                                            <TableHeader className="bg-gray-50/50">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="font-semibold text-gray-600 h-10 py-0 pl-6">Sản phẩm</TableHead>
                                                    <TableHead className="font-semibold text-gray-600 h-10 py-0 text-center">Số lượng</TableHead>
                                                    <TableHead className="font-semibold text-gray-600 h-10 py-0 text-right pr-6">Thành tiền</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupedItems.map((group, idx) => {
                                                    if (group.is_combo) {
                                                        return (
                                                            <React.Fragment key={`combo-${idx}`}>
                                                                 <TableRow className="bg-blue-50/40 border-l-[3px] border-l-blue-400">
                                                                    <TableCell colSpan={2} className="py-3 pl-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <Package size={16} className="text-blue-500" />
                                                                            <span className="font-semibold text-blue-900">{group.name}</span>
                                                                            <Badge className="bg-blue-600 hover:bg-blue-600 text-[10px] h-4 tracking-tighter">COMBO SAVER</Badge>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right pr-6 font-bold text-blue-900 text-sm">
                                                                        {formatPrice(group.total)}
                                                                    </TableCell>
                                                                </TableRow>
                                                                {group.items.map((it: OrderItem) => (
                                                                    <TableRow key={it.id} className="border-b border-gray-50/50 last:border-b-0 hover:bg-transparent">
                                                                        <TableCell className="pl-12 py-3">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-10 h-10 rounded border border-gray-100 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                                                                                    {it.product_image || it.product?.image ? (
                                                                                        <img src={it.product_image || it.product?.image} className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <Package size={20} className="text-gray-300" />
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="text-sm font-medium text-gray-800">{it.product_name}</div>
                                                                                    <div className="text-[11px] text-gray-500">{it.variant_name}</div>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center font-medium text-gray-600 py-3 text-sm">x{it.quantity}</TableCell>
                                                                        <TableCell className="text-right text-gray-400 text-[11px] italic pr-6 italic">Bao gồm trong combo</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </React.Fragment>
                                                        )
                                                    }

                                                    const isReward = group.is_reward;
                                                    return (
                                                        <TableRow key={group.id} className={`hover:bg-gray-50/30 transition-colors border-b border-gray-50 last:border-b-0 ${isReward ? 'bg-green-50/20' : ''}`}>
                                                            <TableCell className="py-3 pl-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-12 h-12 rounded-lg border border-gray-100 bg-white overflow-hidden shrink-0 relative p-0.5 flex items-center justify-center">
                                                                        {group.product_image || group.product?.image || group.image ? (
                                                                            <img src={group.product_image || group.product?.image || group.image} className="w-full h-full object-cover rounded" />
                                                                        ) : (
                                                                            <Package size={24} className="text-gray-300" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-gray-900">{group.product_name}</div>
                                                                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                                                                            <span>{group.variant_name}</span>
                                                                            {isReward && <Badge className="bg-emerald-500 hover:bg-emerald-500 text-[9px] h-4 px-1.5 font-bold uppercase">Quà tặng</Badge>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className="text-sm text-gray-700 font-medium">x{group.quantity}</span>
                                                            </TableCell>
                                                            <TableCell className="text-right font-semibold text-gray-900 pr-6 text-sm">
                                                                {isReward ? 'MIỄN PHÍ' : formatPrice(group.total)}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CustomCard>

                                {/* Totals Summary Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Billing Summary */}
                                    <CustomCard title="Tổng quát thanh toán" isShowHeader={true}>
                                        <div className="p-4 space-y-3">
                                            {/* Logic hiển thị theo cấu trúc giỏ hàng/checkout success */}
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Tạm tính (Tổng cộng dòng):</span>
                                                <span className="font-medium text-gray-900">{formatPrice(itemsSubtotal)}</span>
                                            </div>

                                            {additionalDiscount > 0 && (
                                                <div className="flex justify-between text-sm text-red-600">
                                                    <div className="flex flex-col">
                                                        <span>Chiết khấu đơn hàng:</span>
                                                        <span className="text-[10px] text-red-400 font-medium">(Voucher / Giảm giá bổ sung)</span>
                                                    </div>
                                                    <span className="font-medium">-{formatPrice(additionalDiscount)}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Phí giao hàng:</span>
                                                <span className="font-medium text-gray-900">{formatPrice(record.shipping_fee)}</span>
                                            </div>

                                            <div className="pt-3 border-t border-gray-100 flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tổng thanh toán</span>
                                                    <span className="text-2xl font-bold text-blue-600 tracking-tighter">{formatPrice(record.total_amount)}</span>
                                                </div>
                                                <div className="bg-slate-900 px-3 py-2 rounded-lg text-white">
                                                    <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest leading-none mb-1">Phương thức</div>
                                                    <div className="text-[11px] font-semibold flex items-center gap-1.5 leading-none">
                                                        <CreditCard size={12} />
                                                        {record.payment_method?.name || 'COD'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>

                                    {/* Shipping Info */}
                                    <CustomCard title="Thông tin giao hàng" isShowHeader={true}>
                                        <div className="p-4 space-y-4">
                                            <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <MapPin size={18} className="text-gray-400 shrink-0 mt-0.5" />
                                                <div className="text-xs text-gray-700 leading-relaxed">
                                                    {record.shipping_address}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <User size={14} className="text-blue-500" />
                                                    <span className="font-medium">{record.customer_name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <Phone size={14} className="text-green-500" />
                                                    <span className="font-medium">{record.customer_phone}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>
                                </div>
                            </div>

                            {/* RIGHT COLUMN: Management & Actions */}
                            <div className="space-y-6">
                                
                                {/* Status Update */}
                                <CustomCard title="Cập nhật trạng thái" isShowHeader={true}>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-500 ml-1 flex items-center gap-1">
                                                <Truck size={12} /> Trạng thái vận hành
                                            </label>
                                            <Select 
                                                value={data.order_status} 
                                                onValueChange={(v) => setData('order_status', v)}
                                            >
                                                <SelectTrigger className="w-full text-sm h-10 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ORDER_STATUSES.map(s => (
                                                        <SelectItem key={s.value} value={s.value} className="text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <s.icon size={14} className={s.color.split(' ')[1]} />
                                                                {s.label}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-semibold text-gray-500 ml-1 flex items-center gap-1">
                                                <Receipt size={12} /> Kế toán thanh toán
                                            </label>
                                            <Select 
                                                value={data.payment_status} 
                                                onValueChange={(v) => setData('payment_status', v)}
                                            >
                                                <SelectTrigger className="w-full text-sm h-10 rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {PAYMENT_STATUSES.map(s => (
                                                        <SelectItem key={s.value} value={s.value} className="text-sm">
                                                            {s.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Accounting Options - Only show when status is Completed */}
                                        {data.order_status === 'completed' && record.order_status !== 'completed' && (
                                            <div className="p-3 rounded-xl bg-green-50 border border-green-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <Label htmlFor="create_receipt" className="text-xs font-bold text-green-800">Tạo phiếu thu</Label>
                                                        <span className="text-[10px] text-green-600">Ghi vào sổ quỹ hệ thống</span>
                                                    </div>
                                                    <Switch 
                                                        id="create_receipt"
                                                        checked={data.create_receipt}
                                                        onCheckedChange={(v) => setData('create_receipt', v)}
                                                    />
                                                </div>
                                                
                                                {data.create_receipt && (
                                                    <div className="space-y-1.5 animate-in zoom-in-95 duration-200">
                                                        <label className="text-[10px] font-bold text-green-700 uppercase tracking-wider ml-1">Lý do thu tiền</label>
                                                        <Select 
                                                            value={data.receipt_reason_id}
                                                            onValueChange={(v) => setData('receipt_reason_id', v)}
                                                        >
                                                            <SelectTrigger className="w-full text-[12px] h-8 rounded-lg bg-white border-green-200 focus:ring-green-500">
                                                                <SelectValue placeholder="Chọn lý do" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {cashReasons.map((reason: any) => (
                                                                    <SelectItem key={reason.id} value={reason.id.toString()} className="text-[12px]">
                                                                        {reason.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <Button 
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 gap-2 mt-2 transition-all active:scale-[0.98]"
                                            onClick={handleUpdate}
                                            disabled={processing}
                                        >
                                            <Save size={16} />
                                            Lưu thay đổi
                                        </Button>
                                    </div>
                                </CustomCard>

                                {/* Customer Notes & Internal */}
                                <CustomCard title="Ghi chú & Lưu ý" isShowHeader={true}>
                                    <div className="p-4 space-y-4">
                                        <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-1">
                                                <Info size={12} /> Khách hàng nhắn gửi
                                            </div>
                                            <p className="text-xs text-orange-900 italic leading-relaxed">
                                                {record.notes ? `"${record.notes}"` : "Không có ghi chú từ khách hàng."}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Lưu ý nội bộ</label>
                                            <textarea 
                                                className="w-full min-h-[80px] rounded-xl border-gray-200 bg-gray-50 p-3 text-xs focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                                                placeholder="VD: Khách quen, cần đóng gói kỹ..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Quick Info */}
                                <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 flex gap-3">
                                    <div className="size-8 rounded-full bg-white flex items-center justify-center text-sky-600 shadow-sm shrink-0 mt-1">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div className="text-xs text-sky-900 leading-relaxed font-medium">
                                        Đơn hàng này được tạo tự động từ hệ thống Checkout. Mọi thay đổi tồn kho sẽ được thực hiện khi trạng thái chuyển sang <span className="font-bold underline">Đã hủy</span> hoặc <span className="font-bold underline">Hoàn thành</span>.
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

