import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Package, ArrowRight, Loader2 } from 'lucide-react';
import { getCsrfHeaders } from '@/lib/helper';

interface ImportOrder {
    id: number;
    code: string;
    supplier?: { id: number; name: string };
    warehouse?: { id: number; name: string };
    total_amount: number;
    status: string;
    created_at: string;
    items?: Array<{
        id: number;
        product_name: string;
        quantity: number;
    }>;
}

interface SelectImportOrderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (importOrderId: number) => void;
}

export default function SelectImportOrderModal({
    open,
    onOpenChange,
    onSelect,
}: SelectImportOrderModalProps) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<ImportOrder[]>([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0,
    });

    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                perPage: '10',
            });
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`/backend/return-import-order/import-orders?${params.toString()}`, {
                headers: {
                    'Accept': 'application/json',
                    ...getCsrfHeaders(),
                },
            });

            const data = await response.json();
            if (data.success && data.data) {
                setOrders(data.data.data || []);
                setPagination({
                    current_page: data.data.current_page || 1,
                    last_page: data.data.last_page || 1,
                    total: data.data.total || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching import orders:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        if (open) {
            fetchOrders(1);
        }
    }, [open, fetchOrders]);

    const handleSearch = useCallback(() => {
        fetchOrders(1);
    }, [fetchOrders]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }, [handleSearch]);

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === null || amount === undefined) return '0₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="wide-modal max-h-[85vh] overflow-hidden flex flex-col !w-[1100px] !max-w-[1100px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Chọn đơn nhập hàng để trả
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="flex gap-2 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm theo mã đơn nhập..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="pl-10"
                            />
                        </div>
                        <Button onClick={handleSearch} variant="outline">
                            Tìm kiếm
                        </Button>
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Package className="h-12 w-12 text-muted-foreground mb-3" />
                                <p className="text-muted-foreground">
                                    Không tìm thấy đơn nhập hàng đã hoàn thành
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {orders.map((order) => {
                                    const totalQty = order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
                                    return (
                                        <div
                                            key={order.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-4"
                                            onClick={() => onSelect(order.id)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-semibold text-blue-600 whitespace-nowrap">{order.code}</span>
                                                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                        {order.created_at}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                                    <span className="whitespace-nowrap">NCC: <span className="font-medium">{order.supplier?.name || '-'}</span></span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="whitespace-nowrap">Kho: <span className="font-medium">{order.warehouse?.name || '-'}</span></span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <span className="whitespace-nowrap">SL: <span className="font-medium">{totalQty.toLocaleString('vi-VN')}</span></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 flex-shrink-0">
                                                <div className="text-right whitespace-nowrap">
                                                    <div className="font-medium text-lg">{formatCurrency(order.total_amount)}</div>
                                                    <div className="text-xs text-green-600">Đã nhập kho</div>
                                                </div>
                                                <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {pagination.last_page > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4 gap-4">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                Trang {pagination.current_page} / {pagination.last_page} ({pagination.total} đơn)
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => fetchOrders(pagination.current_page - 1)}
                                >
                                    Trước
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page >= pagination.last_page}
                                    onClick={() => fetchOrders(pagination.current_page + 1)}
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
