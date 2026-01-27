import { useMemo, memo } from 'react'
import { usePage } from '@inertiajs/react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import InputError from './input-error'
import EditorPage from './editor'
import CustomCard from './custom-card'
import { Eye } from 'lucide-react'

export interface TranslationFieldConfig {
    key: string
    label: string
    type: 'input' | 'textarea' | 'editor'
    required?: boolean
    rows?: number
    placeholder?: string
}

interface ICustomTranslationFieldsProps {
    fields: TranslationFieldConfig[]
    values: Record<string, string>
    defaultValues?: Record<string, string>
    defaultLocale?: string // Locale của ngôn ngữ mặc định để hiển thị trong URL "Bản gốc"
    currentLocale?: string // Locale đang dịch (language.canonical) để dùng cho input prefix
    errors?: Record<string, string | string[]>
    onChange: (key: string, value: string) => void
    showDefaultValues?: boolean
    className?: string
    onPreview?: (fieldKey: string) => void
}

// Memoize field component để tránh re-render không cần thiết
const TranslationField = memo(({ 
    field, 
    value, 
    defaultValue, 
    error, 
    onChange, 
    showDefaultValues,
    defaultLocale = 'vi',
    currentLocale = '', // Locale đang dịch (language.canonical)
    onPreview 
}: {
    field: TranslationFieldConfig
    value: string
    defaultValue: string
    error?: string
    onChange: (key: string, value: string) => void
    showDefaultValues: boolean
    defaultLocale?: string
    currentLocale?: string // Locale đang dịch
    onPreview?: (fieldKey: string) => void
}) => {
    const pageProps = usePage().props as { app?: { url?: string } }
    const appUrl = pageProps.app?.url || ''
    const SUFFIX = '.html'
    
    // Format canonical thành full URL với app URL
    // Nếu defaultLocale là 'vn' hoặc 'vi', không thêm locale vào URL "Bản gốc"
    const formattedCanonical = useMemo(() => {
        if (field.key === 'canonical' && defaultValue) {
            const isDefaultVn = defaultLocale === 'vn' || defaultLocale === 'vi'
            if (isDefaultVn) {
                return `${appUrl}${defaultValue}${SUFFIX}`
            }
            return `${appUrl}/${defaultLocale}/${defaultValue}${SUFFIX}`
        }
        return defaultValue
    }, [field.key, defaultValue, appUrl, defaultLocale])
    
    // Format base URL với locale đang dịch cho input prefix
    // Luôn dùng currentLocale (locale đang dịch), không dùng defaultLocale
    const baseUrlWithLocale = useMemo(() => {
        // Loại bỏ dấu / cuối cùng của appUrl nếu có để tránh double slash
        const cleanAppUrl = appUrl.replace(/\/+$/, '')
        if (currentLocale) {
            return `${cleanAppUrl}/${currentLocale}/`
        }
        return `${cleanAppUrl}/`
    }, [appUrl, currentLocale])
    
    // Hàm kiểm tra nội dung có dài không (cần preview)
    const isLongContent = useMemo(() => {
        if (!defaultValue) return false
        const textContent = defaultValue.replace(/<[^>]*>/g, '')
        return textContent.length > 200 || defaultValue.includes('<p>') || defaultValue.includes('<div>')
    }, [defaultValue])
    
    const shouldShowPreview = defaultValue && isLongContent
    
    return (
        <div className="grid grid-cols-1 gap-4 mb-[20px]">
            <div className="col-span-1">
                <div className="flex items-center gap-2 mb-[10px]">
                    <Label htmlFor={field.key}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {showDefaultValues && defaultValue && shouldShowPreview && onPreview && field.key === 'content' && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onPreview(field.key)}
                            className="h-7 px-2 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            Xem nội dung
                        </Button>
                    )}
                </div>
                
                {showDefaultValues && defaultValue && field.key !== 'content' && (
                    <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-[8px] border border-blue-200 dark:border-blue-800">
                        <div className="font-medium text-sm text-blue-900 dark:text-blue-100 mb-2">Bản gốc:</div>
                        {!shouldShowPreview && (
                            <div className="text-sm text-blue-800 dark:text-blue-200 line-clamp-3">
                                {field.key === 'canonical' 
                                    ? formattedCanonical 
                                    : String(defaultValue).replace(/<[^>]*>/g, '').substring(0, 200)
                                }
                                {field.key !== 'canonical' && String(defaultValue).replace(/<[^>]*>/g, '').length > 200 && '...'}
                            </div>
                        )}
                        {shouldShowPreview && !onPreview && (
                            <div className="text-sm text-blue-800 dark:text-blue-200 line-clamp-3">
                                {field.key === 'canonical' 
                                    ? formattedCanonical 
                                    : String(defaultValue).replace(/<[^>]*>/g, '').substring(0, 200) + '...'
                                }
                            </div>
                        )}
                    </div>
                )}
                
                {field.type === 'input' && (
                    field.key === 'canonical' ? (
                        <div className="relative">
                            <span className="base-url">{baseUrlWithLocale}</span>
                            <Input
                                id={field.key}
                                type="text"
                                name={field.key}
                                value={value}
                                onChange={(e) => onChange(field.key, e.target.value)}
                                placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                                className={error ? 'border-red-500' : ''}
                                style={{ paddingLeft: `${Math.max(baseUrlWithLocale.length * 7, 180)}px` }}
                            />
                        </div>
                    ) : (
                        <Input
                            id={field.key}
                            type="text"
                            name={field.key}
                            value={value}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                            className={error ? 'border-red-500' : ''}
                        />
                    )
                )}
                
                {field.type === 'textarea' && (
                    <Textarea
                        id={field.key}
                        name={field.key}
                        value={value}
                        onChange={(e) => onChange(field.key, e.target.value)}
                        placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                        rows={field.rows || 4}
                        className={error ? 'border-red-500' : ''}
                    />
                )}
                
                {field.type === 'editor' && (
                    <EditorPage
                        name={field.key}
                        value={value}
                        onChange={(data: string) => onChange(field.key, data)}
                    />
                )}
                
                <InputError message={error} className="mt-[5px]" />
            </div>
        </div>
    )
})

TranslationField.displayName = 'TranslationField'

const CustomTranslationFields = ({
    fields,
    values,
    defaultValues = {},
    defaultLocale = 'vi',
    currentLocale = '',
    errors = {},
    onChange,
    showDefaultValues = true,
    className = '',
    onPreview
}: ICustomTranslationFieldsProps) => {
    
    const renderField = (field: TranslationFieldConfig) => {
        const value = values[field.key] || ''
        const defaultValue = defaultValues[field.key] || ''
        // Format error: nếu là array thì lấy phần tử đầu tiên, nếu là string thì dùng trực tiếp
        const errorValue = errors[field.key]
        const error = Array.isArray(errorValue) ? errorValue[0] : errorValue
        
        return (
            <TranslationField
                key={field.key}
                field={field}
                value={value}
                defaultValue={defaultValue}
                error={error}
                onChange={onChange}
                showDefaultValues={showDefaultValues}
                defaultLocale={defaultLocale}
                currentLocale={currentLocale}
                onPreview={onPreview}
            />
        )
    }
    
    return (
        <CustomCard
            isShowHeader={true}
            title="Nội dung dịch"
            className={className}
        >
            {fields.map(field => renderField(field))}
        </CustomCard>
    )
}

// Memoize component để tránh re-render không cần thiết
export default memo(CustomTranslationFields)

