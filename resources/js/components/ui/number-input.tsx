import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface NumberInputProps extends Omit<React.ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> {
    value: number | null | undefined;
    onChange?: (value: number | null) => void;
    onBlur?: (value: number | null) => void;
    min?: number;
    max?: number;
    step?: number;
    allowEmpty?: boolean;
    disabled?: boolean;
    loading?: boolean;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
    ({ 
        className,
        value,
        onChange,
        onBlur,
        min = 0,
        max,
        step = 1,
        allowEmpty = false,
        disabled = false,
        loading = false,
        ...props 
    }, ref) => {
        const [internalValue, setInternalValue] = React.useState<string>(
            value !== null && value !== undefined ? String(value) : ''
        );

        // Sync với value từ props
        React.useEffect(() => {
            if (value !== null && value !== undefined) {
                setInternalValue(String(value));
            } else if (!allowEmpty) {
                setInternalValue('0');
            } else {
                setInternalValue('');
            }
        }, [value, allowEmpty]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            
            // Cho phép rỗng nếu allowEmpty
            if (allowEmpty && inputValue === '') {
                setInternalValue('');
                onChange?.(null);
                return;
            }

            // Chỉ cho phép số (loại bỏ tất cả ký tự không phải số)
            const numericValue = inputValue.replace(/[^0-9]/g, '');
            
            // Nếu rỗng và không allowEmpty, set về 0
            if (numericValue === '') {
                if (allowEmpty) {
                    setInternalValue('');
                    onChange?.(null);
                } else {
                    setInternalValue('0');
                    onChange?.(0);
                }
                return;
            }

            setInternalValue(numericValue);
            
            // Parse và validate
            const numValue = parseInt(numericValue, 10);
            if (!isNaN(numValue)) {
                // Validate min/max sẽ được xử lý ở onBlur
                onChange?.(numValue);
            }
        };

        const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            const inputValue = e.target.value;
            let finalValue: number | null = null;

            if (inputValue === '' || inputValue === '-') {
                if (allowEmpty) {
                    finalValue = null;
                } else {
                    finalValue = min ?? 0;
                }
            } else {
                const numValue = parseInt(inputValue, 10);
                if (!isNaN(numValue)) {
                    let validatedValue = numValue;
                    if (min !== undefined && validatedValue < min) {
                        validatedValue = min;
                    }
                    if (max !== undefined && validatedValue > max) {
                        validatedValue = max;
                    }
                    finalValue = validatedValue;
                } else {
                    finalValue = allowEmpty ? null : (min ?? 0);
                }
            }

            // Update internal value
            setInternalValue(finalValue !== null ? String(finalValue) : '');

            // Call callbacks
            if (finalValue !== value) {
                onChange?.(finalValue);
            }
            onBlur?.(finalValue);
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                e.currentTarget.blur();
            }
            // Allow: backspace, delete, tab, escape, enter, decimal point
            if ([46, 8, 9, 27, 13, 110, 190].indexOf(e.keyCode) !== -1 ||
                // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                (e.keyCode === 65 && e.ctrlKey === true) ||
                (e.keyCode === 67 && e.ctrlKey === true) ||
                (e.keyCode === 86 && e.ctrlKey === true) ||
                (e.keyCode === 88 && e.ctrlKey === true) ||
                // Allow: home, end, left, right
                (e.keyCode >= 35 && e.keyCode <= 39)) {
                return;
            }
            // Ensure that it is a number and stop the keypress
            if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                e.preventDefault();
            }
        };

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="numeric"
                value={internalValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={disabled || loading}
                className={cn("text-center", className)}
                {...props}
            />
        );
    }
);

NumberInput.displayName = "NumberInput";

export { NumberInput };

