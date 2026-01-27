import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { router } from '@inertiajs/react';
import { AddBatchModal } from './add-batch-modal';
import { getCsrfHeaders } from '@/lib/helper';

export interface ProductBatch {
    id: number;
    code: string;
    manufactured_at: string | null;
    expired_at: string | null;
    stock_quantity: number;
    is_default: boolean;
    status?: string;
}

export interface BatchAllocation {
    batch_id: number;
    batch_code: string;
    quantity: number;
}

interface SelectBatchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: number;
    variantId?: number; // Alias for productVariantId for return order
    productVariantId?: number | null; // For import order (backward compatibility)
    warehouseId?: number;
    requiredQuantity?: number; // Số lượng sản phẩm cần (cho return order)
    productQuantity?: number; // Số lượng sản phẩm cần nhập (cho import order - backward compatibility)
    initialAllocations?: BatchAllocation[]; // Phân bổ lô ban đầu (nếu có)
    importBatchAllocations?: BatchAllocation[]; // Lô đã nhập trong import order (để filter khi return)
    onSave?: (allocations: BatchAllocation[]) => void; // Alias for onConfirm for return order
    onConfirm?: (allocations: BatchAllocation[]) => void; // For import order (backward compatibility)
}

export function SelectBatchModal({
    open,
    onOpenChange,
    productId,
    variantId,
    productVariantId,
    warehouseId,
    requiredQuantity,
    productQuantity,
    initialAllocations = [],
    importBatchAllocations = [],
    onSave,
    onConfirm,
}: SelectBatchModalProps) {
    // Support both productQuantity (import order) and requiredQuantity (return order)
    const actualQuantity = (requiredQuantity ?? productQuantity ?? 0);
    const actualVariantId = variantId ?? productVariantId ?? null;
    const actualOnConfirm = onSave ?? onConfirm ?? (() => {});
    const isReturnOrder = importBatchAllocations.length > 0; // Nếu có importBatchAllocations thì là return order
    const [batches, setBatches] = useState<ProductBatch[]>([]);
    const [filteredBatches, setFilteredBatches] = useState<ProductBatch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [allocations, setAllocations] = useState<Map<number, BatchAllocation>>(new Map());
    const [inputValues, setInputValues] = useState<Map<number, string>>(new Map()); // Store input values as strings to allow empty
    const [showLeaveConfirmDialog, setShowLeaveConfirmDialog] = useState(false);
    const [pendingBatchId, setPendingBatchId] = useState<number | null>(null);
    const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track if user has interacted with any input
    const [showAddBatchModal, setShowAddBatchModal] = useState(false);
    const [hasFetched, setHasFetched] = useState(false); // Track if batches have been fetched to prevent infinite loop
    const isFetchingRef = useRef(false); // Use ref to prevent multiple simultaneous fetches

    // Initialize allocations from initialAllocations
    useEffect(() => {
        const map = new Map<number, BatchAllocation>();
        const inputMap = new Map<number, string>();
        
        if (initialAllocations.length > 0) {
            initialAllocations.forEach(alloc => {
                map.set(alloc.batch_id, alloc);
                inputMap.set(alloc.batch_id, alloc.quantity.toString());
            });
        }
        
        setAllocations(map);
        setInputValues(inputMap);
        setHasUserInteracted(false); // Reset interaction flag when modal opens
    }, [initialAllocations, open]);

    // Initialize input values to "0" for all batches when modal opens (if not already set)
    useEffect(() => {
        if (open && batches.length > 0) {
            const newInputValues = new Map(inputValues);
            batches.forEach(batch => {
                // Only set to "0" if not already in inputValues (not initialized from initialAllocations)
                if (!newInputValues.has(batch.id)) {
                    newInputValues.set(batch.id, '0');
                }
            });
            setInputValues(newInputValues);
        }
    }, [open, batches]);

    // Fetch batches
    const fetchBatches = useCallback(async () => {
        if (!open || !productId) return;

        // Prevent multiple simultaneous fetches using ref
        if (isFetchingRef.current) {
            console.log('Fetch already in progress, skipping...');
            return;
        }

        isFetchingRef.current = true;
        setIsLoading(true);
        try {
            // GET request doesn't need CSRF token, but we use helper for consistency
            const headers = getCsrfHeaders();

            // Nếu có variant_id, cần endpoint riêng cho variant batches
            // Tạm thời dùng endpoint product batches, sau sẽ cần thêm endpoint variant
            const url = actualVariantId 
                ? `/backend/product-variant/${actualVariantId}/batches`
                : `/backend/product/${productId}/batches`;

            const response = await fetch(url, {
                credentials: "same-origin",
                headers,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let fetchedBatches = data.data || [];
            
            // Nếu là return order, chỉ hiển thị các lô đã được nhập trong import order
            if (isReturnOrder && importBatchAllocations.length > 0) {
                const importBatchIds = new Set(importBatchAllocations.map((alloc: BatchAllocation) => alloc.batch_id));
                fetchedBatches = fetchedBatches.filter((batch: ProductBatch) => importBatchIds.has(batch.id));
            }
            
            setBatches(fetchedBatches);
            setFilteredBatches(fetchedBatches);
            setHasFetched(true); // Mark as fetched
        } catch (error) {
            console.error("Failed to fetch batches", error);
            setBatches([]);
            setFilteredBatches([]);
            setHasFetched(true); // Mark as fetched even on error to prevent infinite retry
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [open, productId, actualVariantId, isReturnOrder, importBatchAllocations]);

    // Fetch batches only once when modal opens
    useEffect(() => {
        if (open && !hasFetched && !isFetchingRef.current) {
            fetchBatches();
        }
    }, [open, hasFetched, fetchBatches]);
    
    // Reset hasFetched when modal closes
    useEffect(() => {
        if (!open) {
            setHasFetched(false);
            setBatches([]);
            setFilteredBatches([]);
            isFetchingRef.current = false; // Reset fetch flag
        }
    }, [open]);

    // Filter batches by search and status
    useEffect(() => {
        let filtered = batches;

        // Filter by search query
        if (searchQuery.trim()) {
            filtered = filtered.filter(batch =>
                batch.code.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter by status
        if (statusFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(batch => {
                if (statusFilter === 'expired') {
                    return batch.expired_at && new Date(batch.expired_at) < now;
                } else if (statusFilter === 'valid') {
                    return !batch.expired_at || new Date(batch.expired_at) >= now;
                }
                return true;
            });
        }

        setFilteredBatches(filtered);
    }, [batches, searchQuery, statusFilter]);

    // Calculate total allocated quantity
    const totalAllocated = Array.from(allocations.values()).reduce(
        (sum, alloc) => sum + alloc.quantity,
        0
    );

    // Check if there are unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        // If user hasn't interacted with any input, no changes
        if (!hasUserInteracted) {
            return false;
        }
        
        const initialAllocationsArray = initialAllocations || [];
        const initialMap = new Map(initialAllocationsArray.map(a => [a.batch_id, a.quantity]));
        
        // Get all batch IDs that have been interacted with (either in initial or current)
        const allBatchIds = new Set([
            ...initialAllocationsArray.map(a => a.batch_id),
            ...Array.from(inputValues.keys())
        ]);
        
        // Check each batch
        for (const batchId of allBatchIds) {
            const currentInputValue = inputValues.get(batchId);
            const currentQty = currentInputValue 
                ? (currentInputValue.trim() === '' || currentInputValue.trim() === '0' ? 0 : (parseInt(currentInputValue.trim()) || 0))
                : 0;
            const initialQty = initialMap.get(batchId) || 0;
            
            // If current quantity differs from initial, there's a change
            if (currentQty !== initialQty) {
                return true;
            }
        }
        
        // Also check if any allocation was added or removed
        const currentAllocations = Array.from(allocations.values());
        if (currentAllocations.length !== initialAllocationsArray.length) {
            return true;
        }
        
        // Check if any allocation quantity changed
        for (const alloc of currentAllocations) {
            const initialQty = initialMap.get(alloc.batch_id) || 0;
            if (alloc.quantity !== initialQty) {
                return true;
            }
        }
        
        return false;
    }, [allocations, initialAllocations, inputValues, hasUserInteracted]);

    // Check if quantity matches - ensure actualQuantity is a valid number
    const validQuantity = Number(actualQuantity) || 0;
    const isQuantityMatch = totalAllocated === validQuantity;
    const quantityDifference = validQuantity - totalAllocated;

    // Get batch status badge
    const getBatchStatus = (batch: ProductBatch) => {
        if (!batch.expired_at) return null;
        const now = new Date();
        const expiredDate = new Date(batch.expired_at);
        if (expiredDate < now) {
            return { 
                label: 'Hết hạn', 
                className: 'bg-gray-100 border-gray-300 text-gray-700' 
            };
        }
        return { 
            label: 'Còn hạn', 
            className: 'bg-green-100 border-green-300 text-green-700' 
        };
    };

    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '---';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch {
            return '---';
        }
    };

    // Handle quantity change for a batch (from input string)
    const handleQuantityInputChange = (batchId: number, batchCode: string, inputValue: string) => {
        // Mark that user has interacted
        setHasUserInteracted(true);
        
        // Parse to number and validate
        const trimmedValue = inputValue.trim();
        if (trimmedValue === '') {
            // If empty, remove from allocations but keep input empty
            const newInputValues = new Map(inputValues);
            newInputValues.set(batchId, inputValue);
            setInputValues(newInputValues);
            const newAllocations = new Map(allocations);
            newAllocations.delete(batchId);
            setAllocations(newAllocations);
            return;
        }
        
        let qty = Math.max(0, parseInt(trimmedValue) || 0);
        
        // Nếu là return order, validate với max quantity từ import batch allocations
        if (isReturnOrder && importBatchAllocations.length > 0) {
            const importAlloc = importBatchAllocations.find((alloc: BatchAllocation) => alloc.batch_id === batchId);
            const maxQty = importAlloc?.quantity;
            if (maxQty !== undefined && qty > maxQty) {
                // Không cho vượt quá max, giữ nguyên giá trị cũ
                return;
            }
        }
        
        // Update input value
        const newInputValues = new Map(inputValues);
        newInputValues.set(batchId, inputValue);
        setInputValues(newInputValues);
        
        // Update allocation
            if (qty > 0) {
                const newAllocations = new Map(allocations);
                newAllocations.set(batchId, {
                    batch_id: batchId,
                    batch_code: batchCode,
                    quantity: qty,
                });
                setAllocations(newAllocations);
            } else {
                // If 0, remove from allocations
                const newAllocations = new Map(allocations);
                newAllocations.delete(batchId);
                setAllocations(newAllocations);
        }
    };

    // Handle remove allocation
    const handleRemoveAllocation = (batchId: number) => {
        const newAllocations = new Map(allocations);
        const newInputValues = new Map(inputValues);
        newAllocations.delete(batchId);
        newInputValues.delete(batchId);
        setAllocations(newAllocations);
        setInputValues(newInputValues);
    };

    // Handle confirm
    const handleConfirm = () => {
        if (!isQuantityMatch && validQuantity > 0) {
            return; // Prevent confirmation if quantity doesn't match
        }
        actualOnConfirm(Array.from(allocations.values()));
        onOpenChange(false);
    };

    // Handle clear all allocations
    const handleClearAll = () => {
        setAllocations(new Map());
        setInputValues(new Map());
    };

    // Handle click on batch code to navigate to detail page
    const handleBatchCodeClick = (e: React.MouseEvent, batchId: number) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Always show confirmation dialog when clicking on batch code link
        // This prevents accidental navigation and potential data loss
        setPendingBatchId(batchId);
        setShowLeaveConfirmDialog(true);
    };

    // Navigate to batch detail page
    const navigateToBatchDetail = (batchId: number) => {
        router.visit(`/backend/product-batches/${batchId}/detail`);
    };

    // Handle confirm leave
    const handleConfirmLeave = () => {
        if (pendingBatchId !== null) {
            navigateToBatchDetail(pendingBatchId);
            setPendingBatchId(null);
        }
        setShowLeaveConfirmDialog(false);
    };

    // Count selected batches
    const selectedBatchesCount = allocations.size;

    // Handle create default batch
    const handleCreateDefaultBatch = async () => {
        try {
            setIsLoading(true);
            const headers = getCsrfHeaders();

            const url = actualVariantId
                ? `/backend/product-variant/${actualVariantId}/batches/ensure-default`
                : `/backend/product/${productId}/batches/ensure-default`;

            const response = await fetch(url, {
                method: 'POST',
                credentials: "same-origin",
                headers,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Có lỗi xảy ra khi tạo lô default');
            }

            // Reset fetch flag and refresh batches list
            setHasFetched(false);
            await fetchBatches();
        } catch (error: any) {
            console.error('Failed to create default batch', error);
            alert(error.message || 'Có lỗi xảy ra khi tạo lô default');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle batch created successfully
    const handleBatchCreated = () => {
        // Reset fetch flag and refresh batches list
        setHasFetched(false);
        fetchBatches();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="wide-modal max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isReturnOrder ? 'Chọn lô trả hàng' : 'Chọn lô nhập hàng'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Summary Section */}
                    <div className="flex justify-end gap-4 items-center">
                        <div className="text-sm">
                            <span className="font-medium">Số lượng sản phẩm {isReturnOrder ? 'trả' : 'nhập'}:</span>{' '}
                            <span className="font-bold">{validQuantity} sản phẩm</span>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Số lượng phân bố lô đang chọn:</span>{' '}
                            <span className="font-bold">
                                {totalAllocated} sản phẩm{selectedBatchesCount > 0 ? ` thuộc ${selectedBatchesCount} lô` : ''}
                            </span>
                        </div>
                    </div>

                    {/* Warning if quantity doesn't match */}
                    {!isQuantityMatch && validQuantity > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                Không khớp số lượng sản phẩm {isReturnOrder ? 'trả' : 'nhập'} ban đầu. 
                                {!isNaN(quantityDifference) && quantityDifference > 0 
                                    ? ` Còn thiếu ${quantityDifference} sản phẩm.`
                                    : !isNaN(quantityDifference) && quantityDifference < 0
                                    ? ` Thừa ${Math.abs(quantityDifference)} sản phẩm.`
                                    : ' Vui lòng kiểm tra lại số lượng.'
                                }
                            </AlertDescription>
                        </Alert>
                    )}
                    
                    {/* Info for return order */}
                    {isReturnOrder && importBatchAllocations.length > 0 && (
                        <Alert>
                            <AlertDescription>
                                Chỉ được chọn từ các lô đã nhập trong đơn nhập hàng. Số lượng trả tối đa = số lượng đã mua từ mỗi lô.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Search and Filter */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã lô"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="valid">Còn hạn</SelectItem>
                                <SelectItem value="expired">Hết hạn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batches Table */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => setShowAddBatchModal(true)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Thêm lô sản phẩm
                                        </Button>
                                    </TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead>Ngày sản xuất</TableHead>
                                    <TableHead>Hạn sử dụng</TableHead>
                                    <TableHead>SL tồn kho</TableHead>
                                    <TableHead>SL Nhập</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            Đang tải...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBatches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <div className="flex flex-col items-center gap-3">
                                                <p className="text-muted-foreground">Không tìm thấy lô nào</p>
                                                {batches.length === 0 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleCreateDefaultBatch}
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" />
                                                        Tạo lô default
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBatches.map((batch) => {
                                        const allocation = allocations.get(batch.id);
                                        const status = getBatchStatus(batch);
                                        const isSelected = !!allocation;
                                        
                                        // Nếu là return order, lấy max quantity từ import batch allocations
                                        let maxQuantityForBatch: number | undefined = undefined;
                                        if (isReturnOrder && importBatchAllocations.length > 0) {
                                            const importAlloc = importBatchAllocations.find((alloc: BatchAllocation) => alloc.batch_id === batch.id);
                                            maxQuantityForBatch = importAlloc?.quantity;
                                        }

                                        return (
                                            <TableRow key={batch.id}>
                                                <TableCell>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleBatchCodeClick(e, batch.id)}
                                                        className="font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer text-left"
                                                    >
                                                        {batch.code}
                                                    </button>
                                                    {isReturnOrder && maxQuantityForBatch !== undefined && (
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            Đã nhập: {maxQuantityForBatch}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {status && (
                                                        <Badge className={status.className}>
                                                            {status.label}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>{formatDate(batch.manufactured_at)}</TableCell>
                                                <TableCell>{formatDate(batch.expired_at)}</TableCell>
                                                <TableCell>{batch.stock_quantity || 0}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                    <Input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        value={inputValues.get(batch.id) ?? '0'}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            // Allow empty string or valid numbers
                                                            if (value === '' || /^\d*$/.test(value)) {
                                                                    // Nếu là return order, validate với max quantity
                                                                    if (isReturnOrder && maxQuantityForBatch !== undefined && value !== '') {
                                                                        const numVal = parseInt(value) || 0;
                                                                        if (numVal > maxQuantityForBatch) {
                                                                            // Không cho nhập vượt quá max
                                                                            return;
                                                                        }
                                                                    }
                                                                handleQuantityInputChange(batch.id, batch.code, value);
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            // On blur, if empty, set to "0" to show default value
                                                            const value = e.target.value.trim();
                                                            if (value === '') {
                                                                const newInputValues = new Map(inputValues);
                                                                newInputValues.set(batch.id, '0');
                                                                setInputValues(newInputValues);
                                                                // Remove from allocations if was 0
                                                                const newAllocations = new Map(allocations);
                                                                newAllocations.delete(batch.id);
                                                                setAllocations(newAllocations);
                                                                } else {
                                                                    // Validate với max quantity khi blur
                                                                    const numVal = parseInt(value) || 0;
                                                                    if (isReturnOrder && maxQuantityForBatch !== undefined && numVal > maxQuantityForBatch) {
                                                                        // Set về max và cập nhật
                                                                        const newInputValues = new Map(inputValues);
                                                                        newInputValues.set(batch.id, maxQuantityForBatch.toString());
                                                                        setInputValues(newInputValues);
                                                                        const newAllocations = new Map(allocations);
                                                                        newAllocations.set(batch.id, {
                                                                            batch_id: batch.id,
                                                                            batch_code: batch.code,
                                                                            quantity: maxQuantityForBatch,
                                                                        });
                                                                        setAllocations(newAllocations);
                                                                    }
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        className="w-20"
                                                            max={maxQuantityForBatch}
                                                    />
                                                        {isReturnOrder && maxQuantityForBatch !== undefined && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Max: {maxQuantityForBatch}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {isSelected && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveAllocation(batch.id)}
                                                            className="text-blue-600 hover:text-blue-700"
                                                        >
                                                            Bỏ chọn
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearAll}
                            disabled={allocations.size === 0}
                        >
                            Xóa phân bổ lô
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={!isQuantityMatch || allocations.size === 0}
                        >
                            Xác nhận
                        </Button>
                    </div>
                </div>
            </DialogContent>

            {/* Leave Confirmation Dialog - MUST be outside DialogContent to show properly */}
            <AlertDialog open={showLeaveConfirmDialog} onOpenChange={setShowLeaveConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Rời khỏi trang</AlertDialogTitle>
                        <AlertDialogDescription>
                            Nếu bạn rời khỏi trang này, tất cả thay đổi chưa lưu sẽ bị mất. Bạn có chắc chắn muốn rời khỏi trang này?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                            Không phải bây giờ
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmLeave}
                            className="cursor-pointer bg-red-600 hover:bg-red-700"
                        >
                            Rời khỏi trang này
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Batch Modal - Nested modal */}
            <AddBatchModal
                open={showAddBatchModal}
                onOpenChange={setShowAddBatchModal}
                productId={productId}
                productVariantId={productVariantId}
                onSuccess={handleBatchCreated}
            />
        </Dialog>
    );
}
