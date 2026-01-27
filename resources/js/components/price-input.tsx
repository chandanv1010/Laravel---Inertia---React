import { NumberInput } from "@/components/number-input"
import { Badge } from "@/components/ui/badge"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"

interface PriceInputProps extends React.ComponentProps<typeof NumberInput> {
    value?: number | string
    onValueChange?: (value: number | undefined) => void
}

export function PriceInput({ value, onValueChange, className, ...props }: PriceInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [rawInputValue, setRawInputValue] = useState<string>('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const inputElementRef = useRef<HTMLInputElement | null>(null)

    const generateSuggestions = useCallback((input: string): number[] => {
        if (!input || input.trim() === '') return []

        const digits = input.replace(/[^\d]/g, '')
        if (!digits || digits.length === 0) return []

        const baseNumber = parseInt(digits, 10)
        if (isNaN(baseNumber) || baseNumber === 0) return []

        return [
            baseNumber * 10,
            baseNumber * 100,
            baseNumber * 1000,
            baseNumber * 10000,
            baseNumber * 100000,
        ]
    }, [])

    const suggestions = useMemo(() => generateSuggestions(rawInputValue), [rawInputValue, generateSuggestions])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }

        if (showSuggestions) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showSuggestions])

    const handleChange = useCallback((val: number | undefined) => {
        onValueChange?.(val)

        if (val !== undefined && val !== null && val > 0) {
            const digits = String(val).replace(/[^\d]/g, '')
            if (digits.length > 0) {
                setRawInputValue(digits)
                setShowSuggestions(true)
            }
        }
    }, [onValueChange])

    useEffect(() => {
        const findInputElement = () => {
            if (!containerRef.current) return null
            return containerRef.current.querySelector('input') as HTMLInputElement
        }

        const timeoutId = setTimeout(() => {
            const inputElement = findInputElement()
            if (!inputElement) {
                setTimeout(() => {
                    inputElementRef.current = findInputElement()
                    if (inputElementRef.current) {
                        attachListeners(inputElementRef.current)
                    }
                }, 200)
                return
            }

            inputElementRef.current = inputElement
            attachListeners(inputElement)
        }, 100)

        const attachListeners = (inputElement: HTMLInputElement) => {
            const handleInput = (e: Event) => {
                const target = e.target as HTMLInputElement
                const rawValue = target.value || ''
                const digits = rawValue.replace(/[^\d]/g, '')

                if (inputTimeoutRef.current) {
                    clearTimeout(inputTimeoutRef.current)
                }

                inputTimeoutRef.current = setTimeout(() => {
                    setRawInputValue(digits)

                    if (digits.length > 0) {
                        setShowSuggestions(true)
                    } else {
                        setShowSuggestions(false)
                    }
                }, 50)
            }

            const handleFocusEvent = () => {
                if (blurTimeoutRef.current) {
                    clearTimeout(blurTimeoutRef.current)
                    blurTimeoutRef.current = null
                }

                const digits = inputElement.value.replace(/[^\d]/g, '')
                if (digits.length > 0) {
                    setRawInputValue(digits)
                    setShowSuggestions(true)
                }
            }

            inputElement.addEventListener('input', handleInput)
            inputElement.addEventListener('focus', handleFocusEvent)

            const cleanup = () => {
                if (inputTimeoutRef.current) {
                    clearTimeout(inputTimeoutRef.current)
                }
                inputElement.removeEventListener('input', handleInput)
                inputElement.removeEventListener('focus', handleFocusEvent)
            }

                ; (inputElement as any).__priceInputCleanup = cleanup
        }

        return () => {
            clearTimeout(timeoutId)
            if (inputTimeoutRef.current) {
                clearTimeout(inputTimeoutRef.current)
            }
            if (inputElementRef.current && (inputElementRef.current as any).__priceInputCleanup) {
                (inputElementRef.current as any).__priceInputCleanup()
            }
        }
    }, [value])

    useEffect(() => {
        if (value !== undefined && value !== null) {
            const digits = String(value).replace(/[^\d]/g, '')
            if (digits.length > 0) {
                setRawInputValue(digits)
            }
        }
    }, [value])

    const handleFocus = useCallback(() => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
        }

        if (value && Number(value) > 0) {
            const digits = String(value).replace(/[^\d]/g, '')
            if (digits.length > 0) {
                setRawInputValue(digits)
                setShowSuggestions(true)
            }
        }
    }, [value])

    const handleBlur = useCallback(() => {
        blurTimeoutRef.current = setTimeout(() => {
            setShowSuggestions(false)
        }, 300) // Tăng timeout để click vào suggestion được xử lý
    }, [])

    const handleSuggestionClick = useCallback((suggestion: number) => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current)
            blurTimeoutRef.current = null
        }

        if (inputTimeoutRef.current) {
            clearTimeout(inputTimeoutRef.current)
            inputTimeoutRef.current = null
        }

        setRawInputValue('')
        setShowSuggestions(false)
        onValueChange?.(suggestion)
    }, [onValueChange])

    const formatPrice = useCallback((num: number): string => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }, [])

    const suggestionRef = useRef<HTMLDivElement>(null)

    return (
        <div ref={containerRef} className="relative">
            <NumberInput
                ref={inputRef}
                value={value}
                onValueChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={className}
                {...props}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div
                    ref={suggestionRef}
                    className="absolute z-50 left-0 right-0 mt-1 flex flex-wrap gap-2 p-2 bg-white border border-gray-200 rounded-md shadow-lg"
                    onMouseDown={(e) => {
                        // Ngăn blur event khi click vào suggestions
                        e.preventDefault()
                    }}
                >
                    {suggestions.map((suggestion, index) => (
                        <Badge
                            key={`${suggestion}-${index}`}
                            data-suggestion-badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 font-normal px-3 py-1 transition-colors"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSuggestionClick(suggestion)
                            }}
                        >
                            {formatPrice(suggestion)}₫
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    )
}
