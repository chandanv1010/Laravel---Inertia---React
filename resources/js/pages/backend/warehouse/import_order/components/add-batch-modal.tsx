import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCsrfHeaders } from '@/lib/helper';

export interface BatchFormItem {
    code: string;
    manufactured_at: Date | null;
    expired_at: Date | null;
}

interface AddBatchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: number;
    productVariantId: number | null;
    onSuccess: () => void; // Callback khi tạo batch thành công
}

export function AddBatchModal({
    open,
    onOpenChange,
    productId,
    productVariantId,
    onSuccess,
}: AddBatchModalProps) {
    const [items, setItems] = useState<BatchFormItem[]>([
        { code: '', manufactured_at: null, expired_at: null }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<number, string>>({});

    // Reset form when modal opens/closes
    useEffect(() => {
        if (open) {
            setItems([{ code: '', manufactured_at: null, expired_at: null }]);
            setErrors({});
        }
    }, [open]);

    const handleAddMore = () => {
        setItems([...items, { code: '', manufactured_at: null, expired_at: null }]);
    };

    const handleRemove = (index: number) => {
        if (items.length > 1) {
            const newItems = items.filter((_, i) => i !== index);
            setItems(newItems);
            // Remove error for this item
            const newErrors = { ...errors };
            delete newErrors[index];
            setErrors(newErrors);
        }
    };

    const handleItemChange = (index: number, field: keyof BatchFormItem, value: string | Date | null) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
        // Clear error for this item
        const newErrors = { ...errors };
        delete newErrors[index];
        setErrors(newErrors);
    };

    const validate = (): boolean => {
        const newErrors: Record<number, string> = {};
        let isValid = true;

        items.forEach((item, index) => {
            if (!item.code || item.code.trim() === '') {
                newErrors[index] = 'Mã lô là bắt buộc';
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async () => {
        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const headers = getCsrfHeaders();

            const url = productVariantId
                ? `/backend/product-variant/${productVariantId}/batches`
                : `/backend/product/${productId}/batches`;

            const payload = {
                items: items.map(item => ({
                    code: item.code.trim(),
                    manufactured_at: item.manufactured_at ? format(item.manufactured_at, 'yyyy-MM-dd') : null,
                    expired_at: item.expired_at ? format(item.expired_at, 'yyyy-MM-dd') : null,
                }))
            };

            const response = await fetch(url, {
                method: 'POST',
                credentials: "same-origin",
                headers,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Có lỗi xảy ra khi tạo lô');
            }

            // Success - close modal and refresh batches
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Failed to create batches', error);
            alert(error.message || 'Có lỗi xảy ra khi tạo lô');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-h-[90vh] overflow-y-auto"
                style={{ width: '800px', maxWidth: '800px' }}
            >
                <DialogHeader>
                    <DialogTitle>Thêm lô sản phẩm</DialogTitle>
                    <DialogDescription>
                        {items.length < 50 && (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="flex items-center gap-2 text-sm text-blue-700">
                                    <AlertCircle className="h-4 w-4" />
                                    <span>
                                        Bạn đã thêm <strong>{items.length}/50</strong> lô. Còn có thể thêm <strong>{50 - items.length}</strong> lô cho sản phẩm này.
                                    </span>
                                </div>
                            </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Mã lô <span className="text-red-500">*</span></TableHead>
                                    <TableHead className="w-[200px]">Ngày sản xuất</TableHead>
                                    <TableHead className="w-[200px]">Hạn sử dụng</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <Input
                                                    value={item.code}
                                                    onChange={(e) => handleItemChange(index, 'code', e.target.value)}
                                                    placeholder="Nhập/quét mã lô"
                                                    className={errors[index] ? 'border-red-500' : ''}
                                                />
                                                {errors[index] && (
                                                    <p className="text-xs text-red-600">{errors[index]}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {item.manufactured_at
                                                            ? format(item.manufactured_at, 'dd/MM/yyyy')
                                                            : 'dd/MM/yyyy'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={item.manufactured_at || undefined}
                                                        onSelect={(date) => handleItemChange(index, 'manufactured_at', date || null)}
                                                        captionLayout="dropdown"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                        <TableCell>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {item.expired_at
                                                            ? format(item.expired_at, 'dd/MM/yyyy')
                                                            : 'dd/MM/yyyy'}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={item.expired_at || undefined}
                                                        onSelect={(date) => handleItemChange(index, 'expired_at', date || null)}
                                                        captionLayout="dropdown"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                        <TableCell>
                                            {items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemove(index)}
                                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {items.length < 50 && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddMore}
                            className="w-full"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm lô khác
                        </Button>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Đang thêm...' : 'Thêm lô'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
