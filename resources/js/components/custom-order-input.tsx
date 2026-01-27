import { useState, useCallback, useEffect } from 'react';
import { NumberInput } from '@/components/ui/number-input';
import { router } from '@inertiajs/react';

interface CustomOrderInputProps {
    id: number;
    module: string;
    currentValue: number | null | undefined;
    className?: string;
    onUpdate?: (id: number, value: number) => void;
    fieldName?: string; // Cho phép tùy chỉnh field name (mặc định là 'order')
}

export default function CustomOrderInput({
    id,
    module,
    currentValue = 0,
    className = '',
    onUpdate,
    fieldName = 'order'
}: CustomOrderInputProps) {
    const [loading, setLoading] = useState(false);

    const handleBlur = useCallback((value: number | null) => {
        const numValue = value ?? 0;
        
        if (numValue < 0) {
            return;
        }

        if (numValue === currentValue) {
            return;
        }

        setLoading(true);
        
        router.patch(`/backend/${module}/${id}`, {
            [fieldName]: numValue
        }, {
            headers: {
                Accept: "application/json",
            },
            only: ['records', 'flash'],
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setLoading(false);
                onUpdate?.(id, numValue);
            },
            onError: () => {
                setLoading(false);
            }
        });
    }, [currentValue, id, module, fieldName, onUpdate]);

    return (
        <NumberInput
            value={currentValue}
            onChange={() => {}} // Không cần update ngay, chỉ update khi blur
            onBlur={handleBlur}
            min={0}
            disabled={loading}
            loading={loading}
            className={`w-16 ${className}`}
        />
    );
}

