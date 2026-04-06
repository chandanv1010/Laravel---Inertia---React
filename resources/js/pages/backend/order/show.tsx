
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { 
    Clock, Package, Truck, CheckCircle2, XCircle, 
    CreditCard, User, Mail, Phone, MapPin, 
    ExternalLink, ChevronLeft, Save, AlertCircle 
} from 'lucide-react';
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
    total_price: number | string;
    promo_id?: number;
    is_gift?: boolean;
    is_combo_item?: boolean;
    combo_group_id?: string;
    combo_name?: string;
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
    shipping_fee: number;
    discount_total: number;
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
    { value: 'pending', label: 'Chờ xử lý', color: 'text-orange-600 bg-orange-50', icon: Clock },
    { value: 'processing', label: 'Đang xử lý', color: 'text-blue-600 bg-blue-50', icon: Package },
    { value: 'shipping', label: 'Đang giao', color: 'text-indigo-600 bg-indigo-50', icon: Truck },
    { value: 'completed', label: 'Hoàn thành', color: 'text-green-600 bg-green-50', icon: CheckCircle2 },
    { value: 'cancelled', label: 'Đã hủy', color: 'text-red-600 bg-red-50', icon: XCircle },
];

const PAYMENT_STATUSES = [
    { value: 'unpaid', label: 'Chưa thanh toán' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'failed', label: 'Lỗi thanh toán' },
    { value: 'refunded', label: 'Đã hoàn tiền' },
];

const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(price));
};

export default function OrderShow({ record }: { record: Order }) {
    const { data, setData, put, processing } = useForm({
        order_status: record.order_status,
        payment_status: record.payment_status,
        notes: record.notes || ''
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Đơn hàng', href: '/backend/order' },
        { title: record.order_code, href: '#' }
    ];

    const currentStatus = ORDER_STATUSES.find(s => s.value === record.order_status) || ORDER_STATUSES[0];
    const StatusIcon = currentStatus.icon;

    // Group items logic (Same as frontend checkout success)
    const groupedItems = useMemo(() => {
        const groups: Record<string, any> = {};
        const result: any[] = [];

        record.order_items.forEach(item => {
            if (item.is_combo_item && item.combo_group_id) {
                const gid = item.combo_group_id;
                if (!groups[gid]) {
                    groups[gid] = {
                        is_combo: true,
                        name: item.combo_name || 'Gói Combo',
                        image: item.product_image, // Fallback
                        items: [],
                        total: 0
                    };
                    result.push(groups[gid]);
                }
                groups[gid].items.push(item);
                groups[gid].total += Number(item.total_price);
            } else {
                result.push({ ...item, is_combo: false });
            }
        });

        return result;
    }, [record.order_items]);

    const handleUpdate = () => {
        put(`/backend/order/${record.id}`, {
            onSuccess: () => toast.success('Cập nhật đơn hàng thành công'),
            onError: () => toast.error('Có lỗi xảy ra khi cập nhật')
        });
    };

    // Calculate Summary logic (Transparent Pricing)
    // subtotal = sum of displayed rows
    const itemsSubtotal = record.order_items.reduce((sum, item) => sum + Number(item.total_price), 0);
    const additionalDiscount = Number(record.summary_snapshot?.order_discount || 0) + Number(record.summary_snapshot?.voucher_discount || 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Đơn hàng ${record.order_code}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 page-wrapper bg-[#f8f9fa]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => window.history.back()} className="rounded-xl bg-white border shadow-sm">
                            <ChevronLeft size={18} />
                        </Button>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">Chi tiết đơn hàng <span className="text-blue-600">#{record.order_code}</span></h1>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 font-bold text-sm ${currentStatus.color}`}>
                        <StatusIcon size={16} />
                        {currentStatus.label}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
                    
                    {/* LEFT COLUMN: Main Info & Items */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Order Items */}
                        <CustomCard title="Sản phẩm đã mua" isShowHeader={true}>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-b border-gray-100">
                                            <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Sản phẩm</TableHead>
                                            <TableHead className="text-gray-400 font-bold uppercase text-[10px] tracking-widest text-center">Số lượng</TableHead>
                                            <TableHead className="text-right text-gray-400 font-bold uppercase text-[10px] tracking-widest">Thành tiền</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedItems.map((group, idx) => {
                                            if (group.is_combo) {
                                                return (
                                                    <React.Fragment key={idx}>
                                                        <TableRow className="bg-blue-50/30 border-l-4 border-l-blue-500">
                                                            <TableCell colSpan={3} className="py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-1 bg-blue-100 rounded text-blue-600">
                                                                        <Package size={14} />
                                                                    </div>
                                                                    <span className="font-bold text-blue-900">{group.name}</span>
                                                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Gói Combo</span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                        {group.items.map((it: OrderItem) => (
                                                            <TableRow key={it.id} className="border-b border-gray-50 bg-white hover:bg-gray-50/50 transition-colors">
                                                                <TableCell className="pl-12">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded border overflow-hidden shrink-0">
                                                                            <img src={it.product_image || '/images/placeholder.png'} className="w-full h-full object-cover" />
                                                                        </div>
                                                                        <div>
                                                                            <div className="text-sm font-semibold">{it.product_name}</div>
                                                                            <div className="text-xs text-gray-500">{it.variant_name}</div>
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center font-medium">x{it.quantity}</TableCell>
                                                                <TableCell className="text-right text-gray-400 text-xs italic">Bao gồm trong combo</TableCell>
                                                            </TableRow>
                                                        ))}
                                                        <TableRow>
                                                            <TableCell colSpan={2}></TableCell>
                                                            <TableCell className="text-right font-black text-blue-700 pb-4">{formatPrice(group.total)}</TableCell>
                                                        </TableRow>
                                                    </React.Fragment>
                                                )
                                            }

                                            return (
                                                <TableRow key={group.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0">
                                                    <TableCell>
                                                        <div className="flex items-center gap-4 py-2">
                                                            <div className="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden shrink-0 shadow-sm relative">
                                                                <img src={group.product_image || '/images/placeholder.png'} className="w-full h-full object-cover" />
                                                                {group.is_gift && (
                                                                    <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-bl-lg shadow-sm">
                                                                        <GiftIcon size={10} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{group.product_name}</div>
                                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                    {group.variant_name}
                                                                    {group.is_gift && <span className="font-bold text-green-600 uppercase tracking-tighter bg-green-50 px-1.5 py-0.5 rounded">Quà tặng</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-gray-700 underline decoration-blue-500/20 underline-offset-4">x{group.quantity}</TableCell>
                                                    <TableCell className="text-right font-black text-gray-900">
                                                        {group.is_gift ? '0 đ' : formatPrice(group.total_price)}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CustomCard>

                        {/* Customer & Shipping Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20 lg:pb-0">
                        <CustomCard 
                            isShowHeader={true} 
                            headerChildren={
                                <div className="border-b flex items-center gap-2 px-[20px] py-4 bg-gray-50/50">
                                    <User size={18} className="text-blue-600" />
                                    <h3 className="font-bold uppercase text-sm tracking-wide">Khách hàng</h3>
                                </div>
                            }
                        >
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 uppercase font-black tracking-tighter">
                                            {record.customer_name.substring(0, 2)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{record.customer_name}</div>
                                            <div className="text-xs text-gray-500">ID Khách hàng: #{record.customer_id}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-50">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Mail size={14} className="text-gray-400" />
                                            {record.customer_email || 'Không có email'}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Phone size={14} className="text-gray-400" />
                                            {record.customer_phone}
                                        </div>
                                    </div>
                                </div>
                            </CustomCard>

                            <CustomCard 
                                isShowHeader={true} 
                                headerChildren={
                                    <div className="border-b flex items-center gap-2 px-[20px] py-4 bg-gray-50/50">
                                        <MapPin size={18} className="text-blue-600" />
                                        <h3 className="font-bold uppercase text-sm tracking-wide">Địa chỉ giao hàng</h3>
                                    </div>
                                }
                            >
                                <div className="text-sm bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 leading-relaxed text-gray-700 italic">
                                    {record.shipping_address}
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Ghi chú:</div>
                                    <div className="text-sm text-gray-600">{record.notes || 'Không có ghi chú'}</div>
                                </div>
                            </CustomCard>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Actions & Summary */}
                    <div className="space-y-6">
                        
                        {/* UPDATE ORDER STATUS */}
                        <CustomCard title="Trạng thái đơn hàng" isShowHeader={true} className="border-t-4 border-t-blue-600">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Tiến độ đơn hàng</label>
                                    <Select 
                                        value={data.order_status} 
                                        onValueChange={(v) => setData('order_status', v)}
                                    >
                                        <SelectTrigger className="w-full font-bold bg-white border-gray-200">
                                            <SelectValue placeholder="Chọn trạng thái" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ORDER_STATUSES.map(s => (
                                                <SelectItem key={s.value} value={s.value} className="font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <s.icon size={14} />
                                                        {s.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Trạng thái thanh toán</label>
                                    <Select 
                                        value={data.payment_status} 
                                        onValueChange={(v) => setData('payment_status', v)}
                                    >
                                        <SelectTrigger className="w-full font-bold bg-white border-gray-200">
                                            <SelectValue placeholder="Chọn trạng thái" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_STATUSES.map(s => (
                                                <SelectItem key={s.value} value={s.value} className="font-bold">{s.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button 
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-md shadow-blue-100 rounded-xl gap-2 transition-all active:scale-[0.98]"
                                    onClick={handleUpdate}
                                    disabled={processing}
                                >
                                    <Save size={18} />
                                    Cập nhật trạng thái
                                </Button>
                            </div>
                        </CustomCard>

                        {/* ORDER SUMMARY */}
                        <CustomCard 
                            isShowHeader={true} 
                            headerChildren={
                                <div className="border-b flex items-center gap-2 px-[20px] py-4 bg-gray-50/50">
                                    <CreditCard size={18} className="text-blue-600" />
                                    <h3 className="font-bold uppercase text-sm tracking-wide">Tổng quan doanh thu</h3>
                                </div>
                            }
                        >
                            <div className="space-y-4">
                                <div className="space-y-3 pb-4 border-b border-gray-100">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Tạm tính hàng hóa:</span>
                                        <span className="font-bold text-gray-900">{formatPrice(itemsSubtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Phí giao hàng:</span>
                                        <span className="font-bold text-gray-900">{formatPrice(record.shipping_fee)}</span>
                                    </div>
                                    {additionalDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-red-500 italic">
                                            <span>Khuyến mãi giảm thêm:</span>
                                            <span className="font-bold">-{formatPrice(additionalDiscount)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="font-black text-gray-400 uppercase text-xs tracking-widest">Tổng thực thu</span>
                                    <span className="text-2xl font-black text-blue-600 tracking-tighter">
                                        {formatPrice(record.total_amount)}
                                    </span>
                                </div>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        <CheckCircle2 size={12} />
                                        Phương thức thanh toán
                                    </div>
                                    <div className="font-bold text-gray-900 text-sm flex items-center justify-between">
                                        {record.payment_method?.name || 'Thanh toán trực tiếp'}
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${record.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                            {PAYMENT_STATUSES.find(s => s.value === record.payment_status)?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CustomCard>

                        {/* Admin Internal Memo */}
                        <CustomCard 
                            isShowHeader={true} 
                            headerChildren={
                                <div className="border-b flex items-center gap-2 px-[20px] py-4 bg-gray-50/50">
                                    <AlertCircle size={18} className="text-blue-600" />
                                    <h3 className="font-bold uppercase text-sm tracking-wide">Ghi chú nội bộ</h3>
                                </div>
                            }
                        >
                            <textarea 
                                className="w-full min-h-[120px] rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Nhập ghi chú cho nhân viên vận hành..."
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            ></textarea>
                            <p className="text-[10px] text-gray-400 mt-2 italic">* Ghi chú này chỉ quản trị viên và nhân viên mới có thể xem.</p>
                        </CustomCard>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}

function GiftIcon({ size }: { size: number }) {
    return <GiftIconComponent size={size} />;
}

function GiftIconComponent({ size }: { size: number }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <polyline points="20 12 20 22 4 22 4 12"></polyline>
            <rect x="2" y="7" width="20" height="5"></rect>
            <line x1="12" y1="22" x2="12" y2="7"></line>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
        </svg>
    );
}
