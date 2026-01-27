import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Shuffle } from 'lucide-react'
import InputError from '@/components/input-error'

interface VoucherCodeInputProps {
    code: string
    onCodeChange: (code: string) => void
    error?: string
    disabled?: boolean
}

export function VoucherCodeInput({ code, onCodeChange, error, disabled }: VoucherCodeInputProps) {
    const generateRandomCode = () => {
        // Tạo mã voucher nhanh ở client-side (giống import-order)
        const prefixes = ['VC', 'VOUCHER', 'PROMO', 'SALE', 'OFF'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let suffix = '';
        for (let i = 0; i < 6; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const randomCode = `${prefix}${suffix}`;
        onCodeChange(randomCode);
    }

    return (
        <div className="space-y-2">
            <Label htmlFor="code" className="mb-2 block">
                Mã voucher <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
                <Input
                    id="code"
                    name="code"
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
                    placeholder="Nhập mã voucher (VD: SALE50)"
                    className="flex-1"
                    disabled={disabled}
                    required
                />
                <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomCode}
                    disabled={disabled}
                    title="Tự động tạo mã"
                    className="px-3"
                >
                    <Shuffle className="w-4 h-4" />
                </Button>
            </div>
            <InputError message={error} className="mt-1" />
        </div>
    )
}
