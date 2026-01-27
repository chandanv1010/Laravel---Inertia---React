import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { PriceInput } from '@/components/price-input';

export interface ImportCostItem {
    id?: number;
    name: string;
    amount: number;
    notes?: string | null;
}

interface ImportCostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialCosts: ImportCostItem[];
    onConfirm: (costs: ImportCostItem[]) => void;
}

export function ImportCostModal({
    open,
    onOpenChange,
    initialCosts,
    onConfirm
}: ImportCostModalProps) {
    const [costs, setCosts] = useState<ImportCostItem[]>(initialCosts);
    const [newCostName, setNewCostName] = useState('');
    const [newCostAmount, setNewCostAmount] = useState(0);
    const [newCostNotes, setNewCostNotes] = useState('');

    useEffect(() => {
        if (open) {
            setCosts(initialCosts);
        }
    }, [open, initialCosts]);

    const totalCost = costs.reduce((sum, cost) => sum + (cost.amount || 0), 0);

    const handleAddCost = () => {
        if (!newCostName.trim() || newCostAmount <= 0) {
            return;
        }

        const newCost: ImportCostItem = {
            name: newCostName.trim(),
            amount: newCostAmount,
            notes: newCostNotes.trim() || null,
        };

        setCosts([...costs, newCost]);
        setNewCostName('');
        setNewCostAmount(0);
        setNewCostNotes('');
    };

    const handleRemoveCost = (index: number) => {
        const updatedCosts = costs.filter((_, i) => i !== index);
        setCosts(updatedCosts);
    };

    const handleUpdateCost = (index: number, field: keyof ImportCostItem, value: string | number) => {
        const updatedCosts = [...costs];
        updatedCosts[index] = {
            ...updatedCosts[index],
            [field]: value,
        };
        setCosts(updatedCosts);
    };

    const handleConfirm = () => {
        onConfirm(costs);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="wide-modal max-h-[90vh] overflow-hidden flex flex-col"
            >
                <DialogHeader>
                    <DialogTitle>Quản lý chi phí nhập hàng</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    {/* Add new cost form */}
                    <div className="border rounded-md p-4 space-y-3 bg-gray-50">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-4">
                                <Label className="text-xs mb-1 block">Tên chi phí</Label>
                                <Input
                                    placeholder="VD: Phí vận chuyển"
                                    value={newCostName}
                                    onChange={(e) => setNewCostName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCost();
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-span-3">
                                <Label className="text-xs mb-1 block">Số tiền</Label>
                                <div className="relative">
                                    <PriceInput
                                        value={newCostAmount || 0}
                                        onValueChange={(val) => setNewCostAmount(val || 0)}
                                        placeholder="0"
                                        className="pr-8"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCost();
                                            }
                                        }}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">₫</span>
                                </div>
                            </div>
                            <div className="col-span-4">
                                <Label className="text-xs mb-1 block">Ghi chú (tùy chọn)</Label>
                                <Input
                                    placeholder="Ghi chú"
                                    value={newCostNotes}
                                    onChange={(e) => setNewCostNotes(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddCost();
                                        }
                                    }}
                                />
                            </div>
                            <div className="col-span-1 flex items-end">
                                <Button
                                    type="button"
                                    onClick={handleAddCost}
                                    size="sm"
                                    className="w-full"
                                    disabled={!newCostName.trim() || newCostAmount <= 0}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Costs list */}
                    <div className="flex-1 overflow-y-auto border rounded-md">
                        {costs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <p className="text-sm">Chưa có chi phí nào. Thêm chi phí ở trên.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">STT</TableHead>
                                        <TableHead>Tên chi phí</TableHead>
                                        <TableHead>Số tiền</TableHead>
                                        <TableHead>Ghi chú</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costs.map((cost, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={cost.name}
                                                    onChange={(e) => handleUpdateCost(index, 'name', e.target.value)}
                                                    className="border-0 p-0 h-auto focus-visible:ring-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <PriceInput
                                                        value={cost.amount}
                                                        onValueChange={(val) => handleUpdateCost(index, 'amount', val || 0)}
                                                        className="border-0 p-0 h-auto focus-visible:ring-0 text-right pr-6"
                                                    />
                                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">₫</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={cost.notes || ''}
                                                    onChange={(e) => handleUpdateCost(index, 'notes', e.target.value)}
                                                    placeholder="Ghi chú"
                                                    className="border-0 p-0 h-auto focus-visible:ring-0"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveCost(index)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-3 flex justify-between items-center">
                        <span className="font-semibold">Tổng chi phí:</span>
                        <span className="font-bold text-lg text-blue-600">
                            {totalCost.toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Áp dụng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
