import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value?: number | string;
    onValueChange: (value: number | undefined) => void;
}

export function CurrencyInput({ value, onValueChange, className, ...props }: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Format number to string with thousand separators (e.g. 1.000.000)
    const formatNumber = (val: number | string | undefined) => {
        if (val === undefined || val === null || val === '') return '';
        const num = typeof val === 'string' ? parseInt(val.replace(/\./g, ''), 10) : val;
        if (isNaN(num)) return '';
        return new Intl.NumberFormat('vi-VN').format(num);
    };

    // Update display value when prop value changes
    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputVal = e.target.value;
        // Remove non-digits
        const rawValue = inputVal.replace(/\D/g, '');

        setDisplayValue(formatNumber(rawValue));
        onValueChange(rawValue ? parseInt(rawValue, 10) : undefined);
    };

    return (
        <Input
            type="text"
            value={displayValue}
            onChange={handleChange}
            className={className}
            {...props}
        />
    );
}
