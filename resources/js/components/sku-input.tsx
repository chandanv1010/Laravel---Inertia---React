import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Shuffle } from "lucide-react"
import { cn } from "@/lib/utils"
import { forwardRef, useState, useEffect } from "react"

interface SkuInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value?: string
    onChange?: (value: string) => void
    onGenerate?: () => string
}

export const SkuInput = forwardRef<HTMLInputElement, SkuInputProps>(
    ({ value, onChange, onGenerate, defaultValue, className, ...props }, ref) => {
        // Support both controlled (value) and uncontrolled (defaultValue) modes
        const isControlled = value !== undefined
        const [inputValue, setInputValue] = useState<string>(value || defaultValue || '')

        useEffect(() => {
            if (isControlled && value !== undefined) {
                setInputValue(value)
            }
        }, [value, isControlled])

        const generateSKU = () => {
            if (onGenerate) {
                const newSku = onGenerate()
                setInputValue(newSku)
                onChange?.(newSku)
            } else {
                // Default SKU generation: P-XXXXXX format (P for Product, V for Variant)
                const randomNum = Math.floor(Math.random() * 900000) + 100000 // 100000-999999
                const newSku = `P-${randomNum}`
                setInputValue(newSku)
                onChange?.(newSku)
            }
        }

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = e.target.value
            setInputValue(newValue)
            onChange?.(newValue)
        }

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type="text"
                    value={isControlled ? inputValue : undefined}
                    defaultValue={!isControlled ? inputValue : undefined}
                    onChange={handleChange}
                    className={cn("pr-10", className)}
                    {...props}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                    onClick={generateSKU}
                    title="Tạo mã SKU ngẫu nhiên"
                >
                    <Shuffle className="h-4 w-4" />
                </Button>
            </div>
        )
    }
)

SkuInput.displayName = 'SkuInput'
