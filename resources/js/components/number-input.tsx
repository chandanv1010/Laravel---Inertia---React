import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { forwardRef, useState, useEffect, useCallback } from "react"

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number | string
    onChange?: (value: number | undefined) => void
    onValueChange?: (value: number | undefined) => void
    thousandSeparator?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
    ({ value, onChange, onValueChange, className, thousandSeparator = '.', ...props }, ref) => {
        const [displayValue, setDisplayValue] = useState('')
        const [isFocused, setIsFocused] = useState(false)

        const formatNumber = useCallback((num: number | string | undefined): string => {
            if (num === undefined || num === '' || num === null) return ''
            let numericValue: number
            if (typeof num === 'string') {
                const cleaned = num.replace(/[.,]/g, '')
                numericValue = cleaned ? parseInt(cleaned, 10) : 0
            } else {
                numericValue = num
            }
            if (isNaN(numericValue)) return ''
            const intValue = Math.round(numericValue)
            const numStr = intValue.toString()
            return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator)
        }, [thousandSeparator])

        const parseNumber = useCallback((str: string): number | undefined => {
            const cleaned = str.replace(/[^\d]/g, '')
            if (!cleaned) return undefined
            return parseInt(cleaned, 10)
        }, [])

        // Sync external value to display only when not focused
        useEffect(() => {
            if (!isFocused) {
                setDisplayValue(formatNumber(value))
            }
        }, [value, isFocused, formatNumber])

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = e.target.value
            // Keep raw digits for display while typing (no formatting)
            const digitsOnly = rawValue.replace(/[^\d]/g, '')
            setDisplayValue(digitsOnly)

            // Notify parent of value change
            const numValue = parseNumber(rawValue)
            if (onChange) onChange(numValue)
            if (onValueChange) onValueChange(numValue)
        }

        const handleFocus = () => {
            setIsFocused(true)
            // Show just digits when focused for easier editing
            const digitsOnly = displayValue.replace(/[^\d]/g, '')
            setDisplayValue(digitsOnly)
        }

        const handleBlur = () => {
            setIsFocused(false)
            // Format the number when losing focus
            const numValue = parseNumber(displayValue)
            setDisplayValue(formatNumber(numValue))
        }

        return (
            <Input
                ref={ref}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                className={cn(
                    "text-blue-600 font-normal text-right",
                    className
                )}
                {...props}
            />
        )
    }
)

NumberInput.displayName = 'NumberInput'

