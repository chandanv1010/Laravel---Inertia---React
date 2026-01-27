import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, User } from '@/types';
import { Head, Link, router, Form, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import CustomCard from '@/components/custom-card';
import CustomPageHeading from '@/components/custom-page-heading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Circle, Package, Printer, MoreVertical, Edit, RotateCcw, AlertCircle, Trash2, XCircle, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ImportOrder, ImportOrderItem } from './save';
import { getCsrfHeaders } from '@/lib/helper';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý nhập hàng',
        href: '/backend/import-order',
    },
];

interface ImportOrderHistoryItem {
    id: number;
    action: string;
    description: string | null;
    user: { id: number; name: string } | null;
    created_at: string;
    created_at_time: string;
}

interface ImportOrderShowProps {
    record: ImportOrder & {
        history?: ImportOrderHistoryItem[];
        created_at_datetime?: string;
    };
}

interface StockInfo {
    warehouse_stocks: Array<{
        warehouse_id: number;
        warehouse_name: string;
        stock_quantity: number;
    }>;
    batch_stocks: Array<{
        batch_id: number;
        batch_code: string;
        warehouse_id: number;
        warehouse_name: string;
        stock_quantity: number;
    }>;
    total_stock: number;
    management_type: string;
}

export default function ImportOrderShow({ record }: ImportOrderShowProps) {
    const { flash } = usePage().props as any;
    const [notes, setNotes] = useState(record.notes || '');
    const [savingNotes, setSavingNotes] = useState(false);
    const [showBatchErrorModal, setShowBatchErrorModal] = useState(false);
    const [showConfirmImportModal, setShowConfirmImportModal] = useState(false);
    const [showConfirmCancelModal, setShowConfirmCancelModal] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isCanceling, setIsCanceling] = useState(false);
    const [stockInfoCache, setStockInfoCache] = useState<Record<string, StockInfo>>({});
    const [loadingStockInfo, setLoadingStockInfo] = useState<Record<string, boolean>>({});
    const isStocked = record.status === 'completed';
    const isPending = record.status === 'pending';
    const isCancelled = record.status === 'cancelled';

    // Show error modal if there's a batch allocation error
    useEffect(() => {
        if (flash?.show_batch_error || (flash?.error && flash.error.includes('Số lượng lô không khớp'))) {
            setShowBatchErrorModal(true);
        }
    }, [flash?.error, flash?.show_batch_error]);

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
        const statusMap: Record<string, { label: string; className: string }> = {
            'draft': { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
            'pending': { label: 'Đang giao dịch', className: 'bg-green-100 text-green-700' },
            'completed': { label: 'Hoàn thành', className: 'bg-blue-100 text-blue-700' },
            'cancelled': { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
        };
        return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    };

    const getPaymentStatusBadge = (paymentAmount: number, totalAmount: number) => {
        const paid = Number(paymentAmount) || 0;
        const total = Number(totalAmount) || 0;

        if (total <= 0) {
            return { label: 'Không xác định', className: 'bg-gray-100 text-gray-700', isPaid: false, isPartial: false };
        }

        if (paid >= total) {
            return { label: 'Đã thanh toán', className: 'bg-green-100 text-green-700', isPaid: true, isPartial: false };
        } else if (paid > 0) {
            return { label: 'Thanh toán 1 phần', className: 'bg-blue-100 text-blue-700', isPaid: false, isPartial: true };
        } else {
            return { label: 'Chưa thanh toán', className: 'bg-yellow-100 text-yellow-700', isPaid: false, isPartial: false };
        }
    };

    // Fetch stock info for a product/variant
    const fetchStockInfo = async (item: ImportOrderItem) => {
        const cacheKey = item.product_variant_id
            ? `variant-${item.product_variant_id}`
            : `product-${item.product_id}`;

        // If already cached, don't fetch again
        if (stockInfoCache[cacheKey]) {
            return;
        }

        // If already loading, don't fetch again
        if (loadingStockInfo[cacheKey]) {
            return;
        }

        setLoadingStockInfo(prev => ({ ...prev, [cacheKey]: true }));

        try {
            const url = item.product_variant_id
                ? `/backend/product/${item.product_id}/variant/${item.product_variant_id}/stock-info`
                : `/backend/product/${item.product_id}/stock-info`;

            const response = await fetch(url, {
                credentials: "same-origin",
                headers: getCsrfHeaders({}, false), // GET request doesn't need Content-Type
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStockInfoCache(prev => ({ ...prev, [cacheKey]: data.data }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch stock info', error);
        } finally {
            setLoadingStockInfo(prev => {
                const newState = { ...prev };
                delete newState[cacheKey];
                return newState;
            });
        }
    };

    const handleImportToStock = () => {
        setShowConfirmImportModal(true);
    };

    const confirmImportToStock = () => {
        setIsImporting(true);
        setShowConfirmImportModal(false);
        router.post(`/backend/import-order/${record.id}/import-to-stock`, {}, {
            preserveScroll: false,
            preserveState: false,
            onSuccess: () => {
                // Inertia sẽ tự động reload khi redirect từ backend
                // Không cần reload thủ công
            },
            onError: (errors) => {
                // Handle error - will be shown via flash message or modal
            },
            onFinish: () => {
                setIsImporting(false);
            }
        });
    };

    const handleEditOrder = () => {
        setShowBatchErrorModal(false);
        router.visit(`/backend/import-order/${record.id}/edit?validate_batch=1`);
    };

    const handleCancelOrder = () => {
        setIsCanceling(true);
        router.post(`/backend/import-order/${record.id}/cancel`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success('Hủy đơn thành công!');
            },
            onError: (errors) => {
                console.error('Error canceling order:', errors);
                // Show error message if available
                const errorMessage = errors?.message ||
                    (flash?.error) ||
                    (typeof errors === 'string' ? errors : 'Có lỗi xảy ra khi hủy đơn');
                toast.error(errorMessage);
            },
            onFinish: () => {
                setIsCanceling(false);
                setShowConfirmCancelModal(false);
            }
        });
    };

    const handleRestoreOrder = () => {
        router.post(`/backend/import-order/${record.id}/restore`, {}, {
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success('Khôi phục đơn thành công!');
            },
            onError: (errors) => {
                console.error('Error restoring order:', errors);
                const errorMessage = errors?.message ||
                    (flash?.error) ||
                    (typeof errors === 'string' ? errors : 'Có lỗi xảy ra khi khôi phục đơn');
                toast.error(errorMessage);
            }
        });
    };

    const handleSaveNotes = () => {
        setSavingNotes(true);
        router.patch(`/backend/import-order/${record.id}`, {
            notes: notes
        }, {
            preserveScroll: true,
            onFinish: () => {
                setSavingNotes(false);
            }
        });
    };

    const status = getStatusBadge(record.status);
    const paymentStatus = getPaymentStatusBadge(record.payment_amount || 0, record.amount_to_pay || 0);
    const totalQuantity = record.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Đơn nhập hàng ${record.code || ''}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={`Đơn nhập hàng ${record.code || ''}`}
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
                                {!isStocked && !isCancelled && (
                                    <Link href={`/backend/import-order/${record.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit className="h-4 w-4 mr-2" />
                                            Sửa đơn
                                        </Button>
                                    </Link>
                                )}
                                <Button variant="outline" size="sm">
                                    <Printer className="h-4 w-4 mr-2" />
                                    In đơn
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <MoreVertical className="h-4 w-4 mr-2" />
                                            Thao tác khác
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {!isStocked && !isCancelled && (
                                            <>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/backend/import-order/${record.id}/edit`} className="cursor-pointer">
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Sửa đơn
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setShowConfirmCancelModal(true)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Hủy đơn
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {isCancelled && (
                                            <DropdownMenuItem
                                                onClick={handleRestoreOrder}
                                                className="cursor-pointer text-green-600 focus:text-green-600"
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Khôi phục đơn
                                            </DropdownMenuItem>
                                        )}
                                        {isStocked && (
                                            <DropdownMenuItem>
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Hoàn trả
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            {/* Main Content */}
                            <div className="col-span-2 space-y-6">
                                {/* Stock Status Section */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        {isStocked ? (
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                <span className="text-lg font-semibold">Đã nhập kho</span>
                                            </div>
                                        ) : isCancelled ? (
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="h-6 w-6 text-red-600" />
                                                <span className="text-lg font-semibold">Đã hủy</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <Circle className="h-6 w-6 text-orange-600" />
                                                <span className="text-lg font-semibold">Chưa nhập kho</span>
                                            </div>
                                        )}

                                        {/* Products Table */}
                                        <div className="border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Sản phẩm</TableHead>
                                                        <TableHead className="text-center">Số lượng</TableHead>
                                                        <TableHead className="text-right">Đơn giá</TableHead>
                                                        <TableHead className="text-right">Thành tiền</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {record.items && record.items.length > 0 ? (
                                                        record.items.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        {item.product_image ? (
                                                                            <img
                                                                                src={item.product_image}
                                                                                alt={item.product_name || 'Product'}
                                                                                className="w-10 h-10 object-cover rounded"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                                <Package className="h-5 w-5 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col">
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    {item.product_id ? (
                                                                                        <Link
                                                                                            href={item.product_variant_id
                                                                                                ? `/backend/product/${item.product_id}/variants/${item.product_variant_id}`
                                                                                                : `/backend/product/${item.product_id}/edit`}
                                                                                            className="text-sm font-medium cursor-pointer hover:text-blue-600 hover:underline"
                                                                                            onMouseEnter={() => fetchStockInfo(item)}
                                                                                        >
                                                                                            {item.product_name || 'N/A'}
                                                                                        </Link>
                                                                                    ) : (
                                                                                        <span
                                                                                            className="text-sm font-medium cursor-pointer hover:text-blue-600"
                                                                                            onMouseEnter={() => fetchStockInfo(item)}
                                                                                        >
                                                                                            {item.product_name || 'N/A'}
                                                                                        </span>
                                                                                    )}
                                                                                </TooltipTrigger>
                                                                                <TooltipContent
                                                                                    className="!max-w-[400px] !p-3 !bg-gray-900 !text-white !border-0 !shadow-xl z-50 [&>svg]:!fill-gray-900"
                                                                                    side="right"
                                                                                >
                                                                                    {(() => {
                                                                                        const cacheKey = item.product_variant_id
                                                                                            ? `variant-${item.product_variant_id}`
                                                                                            : `product-${item.product_id}`;
                                                                                        const stockInfo = stockInfoCache[cacheKey];
                                                                                        const isLoading = loadingStockInfo[cacheKey];

                                                                                        if (isLoading) {
                                                                                            return <div className="text-sm text-white">Đang tải...</div>;
                                                                                        }

                                                                                        if (!stockInfo) {
                                                                                            return <div className="text-sm text-white">Hover để xem thông tin tồn kho</div>;
                                                                                        }

                                                                                        return (
                                                                                            <div className="space-y-2 text-sm text-white">
                                                                                                <div className="font-semibold mb-2 text-white">Thông tin tồn kho</div>

                                                                                                {stockInfo.management_type === 'batch' && stockInfo.batch_stocks.length > 0 ? (
                                                                                                    <>
                                                                                                        <div className="space-y-1">
                                                                                                            {stockInfo.batch_stocks.map((batchStock, idx) => (
                                                                                                                <div key={idx} className="text-xs text-gray-200">
                                                                                                                    <span className="font-medium text-white">Lô {batchStock.batch_code}:</span> {batchStock.stock_quantity} tại <span className="font-medium text-white">{batchStock.warehouse_name}</span>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                        <div className="pt-2 border-t border-gray-700 font-semibold text-white">
                                                                                                            Tổng cộng: {stockInfo.total_stock}
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : stockInfo.warehouse_stocks.length > 0 ? (
                                                                                                    <>
                                                                                                        <div className="space-y-1">
                                                                                                            {stockInfo.warehouse_stocks.map((warehouseStock, idx) => (
                                                                                                                <div key={idx} className="text-xs text-gray-200">
                                                                                                                    <span className="font-medium text-white">{warehouseStock.warehouse_name}:</span> {warehouseStock.stock_quantity}
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                        <div className="pt-2 border-t border-gray-700 font-semibold text-white">
                                                                                                            Tổng cộng: {stockInfo.total_stock}
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <div className="text-xs text-gray-300">Chưa có tồn kho</div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                            {item.variant_sku && (
                                                                                <span className="text-xs text-muted-foreground">SKU: {item.variant_sku}</span>
                                                                            )}
                                                                            {/* Hiển thị các lô đã chọn cho sản phẩm quản lý theo lô */}
                                                                            {item.management_type === 'batch' && item.batch_allocations && (() => {
                                                                                let batchAllocations = item.batch_allocations;
                                                                                // Parse nếu là string
                                                                                if (typeof batchAllocations === 'string') {
                                                                                    try {
                                                                                        batchAllocations = JSON.parse(batchAllocations);
                                                                                    } catch (e) {
                                                                                        batchAllocations = [];
                                                                                    }
                                                                                }
                                                                                // Đảm bảo là array
                                                                                if (!Array.isArray(batchAllocations)) {
                                                                                    batchAllocations = [];
                                                                                }
                                                                                // Chỉ hiển thị nếu có allocations
                                                                                if (batchAllocations.length > 0) {
                                                                                    return (
                                                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                                                            {batchAllocations.map((allocation: any, idx: number) => (
                                                                                                <span
                                                                                                    key={idx}
                                                                                                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded"
                                                                                                >
                                                                                                    {allocation.batch_code || `Lô #${allocation.batch_id}`} | SL: {allocation.quantity || 0}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                                <TableCell className="text-right">{formatCurrency(item.total_price)}</TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={4} className="text-center text-gray-500">
                                                                Không có sản phẩm
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Import to Stock Button */}
                                        {!isStocked && !isCancelled && (
                                            <Button
                                                onClick={handleImportToStock}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                                size="lg"
                                                disabled={isImporting}
                                            >
                                                {isImporting ? 'Đang xử lý...' : 'Nhập kho'}
                                            </Button>
                                        )}
                                    </div>
                                </CustomCard>

                                {/* Payment Summary */}
                                <CustomCard>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {paymentStatus.isPaid ? (
                                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                ) : paymentStatus.isPartial ? (
                                                    <Circle className="h-6 w-6 text-blue-500" />
                                                ) : (
                                                    <XCircle className="h-6 w-6 text-red-500" />
                                                )}
                                                <span className="text-lg font-semibold">
                                                    {paymentStatus.label}
                                                </span>
                                            </div>
                                            {(() => {
                                                // Kiểm tra cả payment_amount và amount_to_pay để xử lý trường hợp thanh toán nhiều lần
                                                const paidAmount = Number(record.payment_amount) || 0;
                                                const totalAmount = Number(record.amount_to_pay) || 0;
                                                const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;

                                                // Chỉ hiển thị nút nếu chưa thanh toán đủ
                                                if (!isFullyPaid) {
                                                    return (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-green-600 border-green-600 hover:bg-green-50"
                                                            onClick={() => {
                                                                router.patch(`/backend/import-order/${record.id}`, {
                                                                    payment_status: 'paid',
                                                                    payment_date: new Date().toISOString().split('T')[0]
                                                                }, {
                                                                    preserveScroll: true,
                                                                    preserveState: false,
                                                                    onSuccess: () => {
                                                                        toast.success('Đã xác nhận thanh toán!');
                                                                    },
                                                                    onError: (errors) => {
                                                                        const errorMessage = errors?.message ||
                                                                            (flash?.error) ||
                                                                            (typeof errors === 'string' ? errors : 'Có lỗi xảy ra khi xác nhận thanh toán');
                                                                        toast.error(errorMessage);
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <CreditCard className="h-4 w-4 mr-1" />
                                                            Xác nhận TT
                                                        </Button>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>Tổng tiền hàng</span>
                                                <span className="font-medium">{formatCurrency(record.total_amount)}</span>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {totalQuantity} sản phẩm
                                            </div>
                                            <div className="flex justify-between text-red-600">
                                                <span>Giảm giá</span>
                                                <span>
                                                    {(() => {
                                                        if (!record.discount) return '-----';

                                                        // Tính số tiền giảm dựa trên discount_type
                                                        let discountAmount = 0;
                                                        if (record.discount_type === 'percent') {
                                                            // Nếu là phần trăm, tính số tiền giảm
                                                            discountAmount = (record.total_amount * record.discount) / 100;
                                                        } else {
                                                            // Nếu là số tiền, dùng trực tiếp
                                                            discountAmount = record.discount;
                                                        }

                                                        return `-${formatCurrency(discountAmount)}`;
                                                    })()}
                                                </span>
                                            </div>
                                            {/* Chi phí nhập hàng chi tiết */}
                                            {record.import_costs && Array.isArray(record.import_costs) && record.import_costs.length > 0 ? (
                                                <>
                                                    <div className="text-sm font-medium pt-1">Chi phí nhập hàng:</div>
                                                    {record.import_costs.map((cost: { name: string; amount: number }, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-sm pl-2">
                                                            <span className="text-gray-600">{cost.name || `Chi phí ${idx + 1}`}</span>
                                                            <span>{formatCurrency(cost.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-sm pl-2 font-medium">
                                                        <span>Tổng chi phí</span>
                                                        <span>{formatCurrency(record.import_cost)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between">
                                                    <span>Chi phí nhập hàng</span>
                                                    <span>{record.import_cost ? formatCurrency(record.import_cost) : '-----'}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-semibold pt-2 border-t text-lg">
                                                <span>Tiền cần trả NCC</span>
                                                <span className="text-blue-600">{formatCurrency(record.amount_to_pay)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* History Section */}
                                {record.history && record.history.length > 0 && (
                                    <CustomCard title="Lịch sử đơn nhập hàng">
                                        <div className="relative">
                                            {/* Timeline */}
                                            <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gray-200" />

                                            <div className="space-y-4">
                                                {record.history.map((historyItem, index) => (
                                                    <div key={historyItem.id} className="relative pl-6">
                                                        {/* Timeline dot */}
                                                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${index === 0
                                                            ? 'bg-blue-500 border-blue-500'
                                                            : 'bg-white border-gray-300'
                                                            }`} />

                                                        <div className="pb-4">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <span className="font-medium text-gray-900">
                                                                    {historyItem.created_at}
                                                                </span>
                                                                <span className="text-gray-500">
                                                                    {historyItem.created_at_time}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 text-sm text-gray-700">
                                                                {historyItem.action}
                                                            </div>
                                                            {historyItem.user && (
                                                                <div className="mt-1 text-xs text-gray-500">
                                                                    Bởi: {historyItem.user.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CustomCard>
                                )}
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-6">
                                {/* Supplier */}
                                <CustomCard title="Nhà cung cấp">
                                    <div className="space-y-2">
                                        {record.supplier ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    {record.supplier.id ? (
                                                        <Link
                                                            href={`/backend/supplier/${record.supplier.id}/edit`}
                                                            className="text-sm font-medium hover:text-blue-600 hover:underline"
                                                        >
                                                            {record.supplier.name}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-sm font-medium">{record.supplier.name}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {record.supplier.email || 'Không có email'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {record.supplier.phone || 'Không có số điện thoại'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {record.supplier.address || 'Không có địa chỉ'}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-500">Chưa chọn nhà cung cấp</span>
                                        )}
                                    </div>
                                </CustomCard>

                                {/* Warehouse */}
                                <CustomCard title="Chi nhánh nhập">
                                    <Select value={record.warehouse_id?.toString() || ''} disabled={isStocked}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Chọn chi nhánh" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={record.warehouse_id?.toString() || ''}>
                                                {record.warehouse?.name || 'Chưa chọn'}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CustomCard>

                                {/* Additional Info */}
                                <CustomCard title="Thông tin bổ sung">
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs">Nhân viên phụ trách</Label>
                                            <Select value={record.responsible_user_id?.toString() || ''} disabled={isStocked}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={record.responsible_user_id?.toString() || ''}>
                                                        {record.responsibleUser?.name || 'Chưa chọn'}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Ngày nhập dự kiến</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal"
                                                        disabled={isStocked}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {record.expected_import_date ? format(new Date(record.expected_import_date), 'dd/MM/yyyy') : 'Chọn ngày'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={record.expected_import_date ? new Date(record.expected_import_date) : undefined}
                                                        disabled
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Tham chiếu</Label>
                                            <Input
                                                value={record.reference || ''}
                                                placeholder="Nhập mã tham chiếu"
                                                disabled={isStocked}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Notes */}
                                <CustomCard title="Ghi chú">
                                    <div className="space-y-2">
                                        <Textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="VD: Chỉ nhận hàng trong giờ hành chính"
                                            rows={4}
                                        />
                                        <Button
                                            onClick={handleSaveNotes}
                                            disabled={savingNotes || notes === record.notes}
                                            size="sm"
                                            className="w-full"
                                        >
                                            {savingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
                                        </Button>
                                    </div>
                                </CustomCard>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Import Modal */}
            <Dialog open={showConfirmImportModal} onOpenChange={setShowConfirmImportModal}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Xác nhận nhập kho</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-base">
                        Bạn có chắc chắn muốn nhập kho đơn hàng này?
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmImportModal(false)}>
                            Hủy
                        </Button>
                        <Button
                            onClick={confirmImportToStock}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isImporting}
                        >
                            {isImporting ? 'Đang xử lý...' : 'Xác nhận'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Allocation Error Modal */}
            <Dialog open={showBatchErrorModal} onOpenChange={setShowBatchErrorModal}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Số lượng lô không khớp số lượng nhập</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-sm text-gray-600">
                        Một số sản phẩm trong đơn nhập có quản lý lô và hạn sử dụng, nhưng số lượng lô được chọn chưa khớp với số lượng nhập. Vui lòng chỉnh sửa đơn nhập để số lượng lô khớp với số lượng sản phẩm trước khi nhập kho.
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBatchErrorModal(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleEditOrder} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Sửa đơn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Cancel Order Modal */}
            <Dialog open={showConfirmCancelModal} onOpenChange={setShowConfirmCancelModal}>
                <DialogContent className="max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>Xác nhận hủy đơn</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-base">
                        Bạn có chắc chắn muốn hủy đơn nhập hàng <strong>{record.code}</strong>? Hành động này không thể hoàn tác.
                    </DialogDescription>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmCancelModal(false)}
                            disabled={isCanceling}
                        >
                            Hủy
                        </Button>
                        <Button
                            onClick={handleCancelOrder}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isCanceling}
                        >
                            {isCanceling ? 'Đang xử lý...' : 'Xác nhận hủy'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
