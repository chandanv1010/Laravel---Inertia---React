import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { toast } from 'sonner';
import CustomCard from '@/components/custom-card';
import CustomPageHeading from '@/components/custom-page-heading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, Package, Printer, MoreVertical, Edit, Trash2, AlertCircle, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getCsrfHeaders } from '@/lib/helper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý trả hàng NCC',
        href: '/backend/return-import-order',
    },
];

interface ReturnImportOrderItem {
    id: number;
    product_id: number;
    product_variant_id: number | null;
    product_name: string;
    product_image: string | null;
    product_sku: string | null;
    variant_sku: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    discount: number;
    discount_type: string;
    management_type: string;
    batch_allocations: any;
}

interface ReturnImportOrder {
    id: number;
    code: string;
    import_order_id: number | null;
    importOrder: {
        id: number;
        code: string;
    } | null;
    supplier_id: number | null;
    supplier: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
    } | null;
    warehouse_id: number;
    warehouse: any;
    return_type: 'by_order' | 'without_order';
    return_reason: string | null;
    total_amount: number;
    discount: number;
    return_cost: number;
    deduction: number;
    refund_amount: number;
    refund_status: 'later' | 'received' | null; // Chỉ có 2 giá trị: 'received' hoặc 'later' (theo migration)
    export_to_stock: boolean;
    status: 'pending' | 'completed' | 'cancelled';
    notes: string | null;
    tags: any;
    user_id: number;
    creators: {
        id: number;
        name: string;
    } | null;
    items: ReturnImportOrderItem[];
    created_at: string;
    created_at_datetime: string;
}

interface ReturnImportOrderShowProps {
    record: ReturnImportOrder;
}

export default function ReturnImportOrderShow({ record }: ReturnImportOrderShowProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [showConfirmExportModal, setShowConfirmExportModal] = useState(false);
    const [notes, setNotes] = useState(record.notes || '');
    const [returnReason, setReturnReason] = useState(record.return_reason || '');
    const [warehouseId, setWarehouseId] = useState(record.warehouse_id?.toString() || '');

    const isCompleted = record.status === 'completed';
    const isPending = record.status === 'pending';
    const isCancelled = record.status === 'cancelled';
    // refund_status chỉ có 2 giá trị: 'received' hoặc 'later' (theo migration)
    const isRefundReceived = record.refund_status === 'received';
    // Chỉ hiển thị nút xác nhận hoàn tiền khi chưa nhận hoàn tiền (status = 'later' hoặc null)
    const isRefundPending = !isRefundReceived && (record.refund_status === 'later' || record.refund_status === null);
    const [isConfirmingRefund, setIsConfirmingRefund] = useState(false);
    const [showConfirmRefundModal, setShowConfirmRefundModal] = useState(false);

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return { label: 'Đã hoàn trả', className: 'bg-green-100 text-green-800' };
            case 'pending':
                return { label: 'Chờ xuất kho', className: 'bg-orange-100 text-orange-800' };
            case 'cancelled':
                return { label: 'Đã hủy', className: 'bg-red-100 text-red-800' };
            default:
                return { label: status, className: 'bg-gray-100 text-gray-800' };
        }
    };

    const handleExportToStock = () => {
        setIsExporting(true);
        fetch(`/backend/return-import-order/${record.id}/export-to-stock`, {
            method: 'POST',
            headers: {
                ...getCsrfHeaders(),
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    toast.success(data.message || 'Xuất kho thành công!');
                    router.reload({ only: ['record'] });
                } else {
                    toast.error(data.message || 'Có lỗi xảy ra khi xuất kho!');
                }
            })
            .catch(error => {
                console.error('Error exporting to stock:', error);
                toast.error('Có lỗi xảy ra khi xuất kho!');
            })
            .finally(() => {
                setIsExporting(false);
                setShowConfirmExportModal(false);
            });
    };

    const handleConfirmRefund = () => {
        setIsConfirmingRefund(true);
        fetch(`/backend/return-import-order/${record.id}/confirm-refund`, {
            method: 'POST',
            headers: {
                ...getCsrfHeaders(),
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        })
            .then(async response => {
                const data = await response.json();

                // Kiểm tra response status và data.success
                if (response.ok && data.success) {
                    toast.success(data.message || 'Xác nhận hoàn tiền thành công!');
                    // Reload toàn bộ page để đảm bảo data được cập nhật
                    router.reload();
                } else {
                    // Nếu có lỗi (422 hoặc data.success = false), hiển thị thông báo lỗi
                    toast.error(data.message || 'Có lỗi xảy ra!');
                    // Vẫn reload để đảm bảo data được cập nhật (có thể đã được confirm từ nơi khác)
                    router.reload();
                }
            })
            .catch(error => {
                console.error('Error confirming refund:', error);
                toast.error('Có lỗi xảy ra!');
            })
            .finally(() => {
                setIsConfirmingRefund(false);
                setShowConfirmRefundModal(false);
            });
    };

    const status = getStatusBadge(record.status);
    const totalQuantity = record.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const totalReturnCost = record.return_cost || 0;
    const totalDeduction = record.deduction || 0;
    const refundAmount = record.refund_amount || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Đơn trả hàng ${record.code || ''}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={`Đơn trả hàng ${record.code || ''}`}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <div className="max-w-[1100px] ml-auto mr-auto">
                        {/* Header Actions */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                {record.created_at_datetime && (
                                    <span className="text-sm text-gray-500">{record.created_at_datetime}</span>
                                )}
                                <Badge className={status.className}>{status.label}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isCompleted && !isCancelled && (
                                    <Link href={`/backend/return-import-order/${record.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Sửa đơn
                                        </Button>
                                    </Link>
                                )}
                                {isPending && (
                                    <Button
                                        onClick={() => setShowConfirmExportModal(true)}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Warehouse className="h-4 w-4 mr-2" />
                                        Xuất kho
                                    </Button>
                                )}
                                <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4 mr-2" />
                                    In đơn
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="col-span-2 space-y-6">
                                {/* Return Status Section */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        {isCompleted ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                <span className="text-lg font-semibold">Đã hoàn trả</span>
                                            </div>
                                        ) : isCancelled ? (
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="h-6 w-6 text-red-600" />
                                                <span className="text-lg font-semibold">Đã hủy</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Circle className="h-6 w-6 text-orange-600" />
                                                <span className="text-lg font-semibold">Chờ xuất kho</span>
                                            </div>
                                        )}

                                        {/* Returned Items Table */}
                                        {record.items && record.items.length > 0 && (
                                            <div className="mt-4">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Sản phẩm</TableHead>
                                                            <TableHead className="text-right">Số lượng</TableHead>
                                                            <TableHead className="text-right">Đơn giá trả</TableHead>
                                                            <TableHead className="text-right">Thành tiền</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {record.items.map((item) => (
                                                            <TableRow key={item.id}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        {item.product_image ? (
                                                                            <img
                                                                                src={item.product_image}
                                                                                alt={item.product_name}
                                                                                className="w-10 h-10 object-cover rounded"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                                                <Package className="h-5 w-5 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <div className="font-medium">{item.product_name}</div>
                                                                            {(item.product_sku || item.variant_sku) && (
                                                                                <div className="text-xs text-gray-500">
                                                                                    SKU: {item.variant_sku || item.product_sku}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                                <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                </CustomCard>

                                {/* Financial Summary */}
                                {isCompleted && (
                                    <CustomCard>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    {isRefundReceived ? (
                                                        <>
                                                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                            <span className="text-lg font-semibold">Đã nhận hoàn tiền</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Circle className="h-6 w-6 text-orange-600" />
                                                            <span className="text-lg font-semibold">Chờ hoàn tiền từ NCC</span>
                                                        </>
                                                    )}
                                                </div>
                                                {isRefundPending && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setShowConfirmRefundModal(true)}
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                                        Xác nhận đã nhận hoàn tiền
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-3 pt-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Giá trị hàng trả:</span>
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-500">{totalQuantity} sản phẩm</div>
                                                        <div className="font-medium">{formatCurrency(record.total_amount)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Chi phí:</span>
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-500">-----</div>
                                                        <div className="font-medium">{formatCurrency(totalReturnCost)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">Giảm trừ trả hàng:</span>
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-500">-----</div>
                                                        <div className="font-medium text-red-600">-{formatCurrency(totalDeduction)}</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t">
                                                    <span className="text-sm font-semibold">Giá trị hoàn trả:</span>
                                                    <div className="text-right">
                                                        <div className="font-bold text-lg">{formatCurrency(refundAmount)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>
                                )}

                                {/* History Section */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Lịch sử đơn trả hàng nhập</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-3 text-sm">
                                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2"></div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{record.created_at_datetime}</span>
                                                        {record.creators && (
                                                            <span className="text-gray-500">{record.creators.name}</span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-600 mt-1">
                                                        {isCompleted ? 'Đã hoàn trả' : isPending ? 'Tạo mới đơn trả hàng nhập' : 'Đã hủy'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CustomCard>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Return From Import Order */}
                                {record.return_type === 'by_order' && record.importOrder && (
                                    <CustomCard>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Hoàn trả từ đơn nhập {record.importOrder.code}</h3>
                                        </div>
                                    </CustomCard>
                                )}

                                {/* Supplier Info */}
                                {record.supplier && (
                                    <CustomCard>
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold">Nhà cung cấp</h3>
                                            <div className="space-y-2">
                                                <div className="font-medium">{record.supplier.name}</div>
                                                {!record.supplier.email && !record.supplier.phone && !record.supplier.address && (
                                                    <div className="text-sm text-gray-500 space-y-1">
                                                        {!record.supplier.email && <div>Không có email</div>}
                                                        {!record.supplier.phone && <div>Không có số điện thoại</div>}
                                                        {!record.supplier.address && <div>Không có địa chỉ</div>}
                                                    </div>
                                                )}
                                                {record.supplier.email && (
                                                    <div className="text-sm text-gray-600">{record.supplier.email}</div>
                                                )}
                                                {record.supplier.phone && (
                                                    <div className="text-sm text-gray-600">{record.supplier.phone}</div>
                                                )}
                                                {record.supplier.address && (
                                                    <div className="text-sm text-gray-600">{record.supplier.address}</div>
                                                )}
                                            </div>
                                        </div>
                                    </CustomCard>
                                )}

                                {/* Return Branch */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Chi nhánh trả</h3>
                                        <Select value={warehouseId} onValueChange={setWarehouseId} disabled>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {record.warehouse && (
                                                    <SelectItem value={record.warehouse.id?.toString() || ''}>
                                                        {record.warehouse.name || 'N/A'}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CustomCard>

                                {/* Additional Information */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold">Thông tin bổ sung</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs mb-1.5 block">Lý do hoàn trả</Label>
                                                <Textarea
                                                    value={returnReason}
                                                    onChange={(e) => setReturnReason(e.target.value)}
                                                    placeholder="Nhập lý do hoàn trả"
                                                    disabled
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CustomCard>

                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Export Modal */}
            <Dialog open={showConfirmExportModal} onOpenChange={setShowConfirmExportModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận xuất kho</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xuất kho đơn trả hàng này? Hành động này sẽ trừ tồn kho và không thể hoàn tác.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmExportModal(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleExportToStock}
                            disabled={isExporting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isExporting ? 'Đang xử lý...' : 'Xác nhận xuất kho'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Refund Modal */}
            <Dialog open={showConfirmRefundModal} onOpenChange={setShowConfirmRefundModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Xác nhận đã nhận hoàn tiền</DialogTitle>
                        <DialogDescription>
                            Bạn xác nhận đã nhận hoàn tiền {formatCurrency(record.refund_amount)} từ nhà cung cấp cho đơn trả hàng này?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmRefundModal(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={handleConfirmRefund}
                            disabled={isConfirmingRefund}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isConfirmingRefund ? 'Đang xử lý...' : 'Xác nhận đã nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

