import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, router, useForm, Form } from '@inertiajs/react'
import { setPreserveState } from '@/lib/helper'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { LoaderCircle, Save } from 'lucide-react'
import CustomLanguageFlags from '@/components/custom-language-flags'
import CustomTranslationFields, { TranslationFieldConfig } from '@/components/custom-translation-fields'
import { dashboard } from '@/routes'
// Helper function để tạo route URL
const getRoute = (name: string, params?: { [key: string]: string | number | undefined }): string => {
    const routes: { [key: string]: string } = {
        'translate.create': '/backend/{module}/{id}/translate/{languageId}',
        'translate.store': '/backend/{module}/{id}/translate/{languageId}',
        'translate.update': '/backend/{module}/{id}/translate/{languageId}',
        'post.index': '/backend/post',
        'product.index': '/backend/product',
    }

    let url = routes[name] || name
    if (params) {
        Object.keys(params).forEach(key => {
            const value = params[key]
            if (value !== undefined) {
                url = url.replace(`{${key}}`, String(value))
            }
        })
    }
    return url
}
import type { BreadcrumbItem } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toSlug } from '@/lib/helper'

interface Language {
    id: number
    name: string
    canonical: string
    image: string
}

interface TranslateRecord {
    id: number
    name?: string
    translated_language_ids?: number[]
}

interface TranslationData {
    name?: string
    description?: string
    content?: string
    canonical?: string
    meta_title?: string
    meta_keyword?: string
    meta_description?: string
    auto_translate?: boolean
}

interface ITranslateProps {
    module: string
    record: TranslateRecord
    language: Language
    translationData?: TranslationData
    defaultData?: TranslationData
    defaultLocale?: string // Locale của ngôn ngữ mặc định (ví dụ: 'vi', 'en')
    languages: Language[]
    fieldsConfig?: TranslationFieldConfig[] // Config từ backend hoặc default
}

// Default config cho Post module
const defaultPostFieldsConfig: TranslationFieldConfig[] = [
    { key: 'name', label: 'Tiêu đề', type: 'input', required: true },
    { key: 'description', label: 'Mô tả', type: 'editor' },
    { key: 'content', label: 'Nội dung', type: 'editor' },
    { key: 'canonical', label: 'Đường dẫn tĩnh', type: 'input' },
    { key: 'meta_title', label: 'Meta Title', type: 'input' },
    { key: 'meta_keyword', label: 'Meta Keyword', type: 'input' },
    { key: 'meta_description', label: 'Meta Description', type: 'textarea', rows: 3 },
]

export default function Translate({
    module,
    record,
    language,
    translationData = {},
    defaultData = {},
    defaultLocale = 'vi',
    languages,
    fieldsConfig
}: ITranslateProps) {
    // Đảm bảo translationData và defaultData không phải null - memoize để tránh re-render
    const safeTranslationData = useMemo(() => translationData || {}, [translationData])
    const safeDefaultData = useMemo(() => defaultData || {}, [defaultData])

    // Sử dụng fieldsConfig từ props hoặc default - memoize để tránh re-render
    const translationFieldsConfig = useMemo(() => fieldsConfig || defaultPostFieldsConfig, [fieldsConfig])

    // Khởi tạo form values - memoize để đảm bảo consistent
    const initialFormValues = useMemo(() => ({
        name: safeTranslationData.name || '',
        description: safeTranslationData.description || '',
        content: safeTranslationData.content || '',
        canonical: safeTranslationData.canonical || '',
        meta_title: safeTranslationData.meta_title || '',
        meta_keyword: safeTranslationData.meta_keyword || '',
        meta_description: safeTranslationData.meta_description || '',
        auto_translate: safeTranslationData.auto_translate || false,
    }), [safeTranslationData])

    const [isAutoTranslate, setIsAutoTranslate] = useState(initialFormValues.auto_translate)
    const [previewField, setPreviewField] = useState<string | null>(null)
    // Track xem canonical đã được chỉnh sửa thủ công chưa
    // Nếu canonical đã có giá trị từ translationData, coi như đã được chỉnh sửa
    const canonicalManuallyEditedRef = useRef(!!safeTranslationData.canonical)

    const [translationValues, setTranslationValues] = useState<{ [key: string]: string }>({
        name: initialFormValues.name || '',
        description: initialFormValues.description || '',
        content: initialFormValues.content || '',
        canonical: initialFormValues.canonical || '',
        meta_title: initialFormValues.meta_title || '',
        meta_keyword: initialFormValues.meta_keyword || '',
        meta_description: initialFormValues.meta_description || '',
    })

    // Tạo một object ổn định cho useForm để tránh re-initialization
    const initialFormDataRef = useRef({
        name: '',
        description: '',
        content: '',
        canonical: '',
        meta_title: '',
        meta_keyword: '',
        meta_description: '',
        auto_translate: false,
    })

    const { setData, processing: formProcessing, errors, reset } = useForm(initialFormDataRef.current)
    const [isProcessing, setIsProcessing] = useState(false)

    // Track router processing state
    useEffect(() => {
        const handleStart = () => setIsProcessing(true)
        const handleFinish = () => setIsProcessing(false)

        const unsubscribeStart = router.on('start', handleStart)
        const unsubscribeFinish = router.on('finish', handleFinish)

        return () => {
            unsubscribeStart()
            unsubscribeFinish()
        }
    }, [])

    const processing = formProcessing || isProcessing

    // Track xem đã mount lần đầu chưa (để tránh reset form khi có validation errors)
    const isInitialMount = useRef(true)

    // Sync translationValues khi safeTranslationData thay đổi (sau khi save và reload)
    // Nhưng không reset khi có validation errors (để giữ lại giá trị user đã nhập)
    useEffect(() => {
        const hasErrors = errors && Object.keys(errors).length > 0

        // Chỉ load lại data từ server nếu:
        // 1. Là lần mount đầu tiên (để load dữ liệu ban đầu)
        // 2. Hoặc không có validation errors (để update sau khi save thành công)
        // Nếu có errors, giữ nguyên giá trị user đã nhập (không reset)
        if (safeTranslationData && Object.keys(safeTranslationData).length > 0) {
            if (isInitialMount.current || !hasErrors) {
                setTranslationValues({
                    name: safeTranslationData.name || '',
                    description: safeTranslationData.description || '',
                    content: safeTranslationData.content || '',
                    canonical: safeTranslationData.canonical || '',
                    meta_title: safeTranslationData.meta_title || '',
                    meta_keyword: safeTranslationData.meta_keyword || '',
                    meta_description: safeTranslationData.meta_description || '',
                })
                if (safeTranslationData.auto_translate !== undefined) {
                    setIsAutoTranslate(safeTranslationData.auto_translate)
                }
                // Reset canonicalManuallyEditedRef nếu có canonical từ server
                canonicalManuallyEditedRef.current = !!safeTranslationData.canonical
            }

            // Đánh dấu đã mount xong
            if (isInitialMount.current) {
                isInitialMount.current = false
            }
        }
    }, [safeTranslationData, errors])

    // Không cần setData nữa vì Form component sẽ tự động handle form data
    // Form component sẽ lấy data từ hidden inputs

    const handleFieldChange = useCallback((key: string, value: string) => {
        // Chỉ update form data, không cần update local state nữa vì form data đã là source of truth
        setData(key as keyof typeof initialFormDataRef.current, value)
        // Update local state để UI sync ngay lập tức
        setTranslationValues((prev: { [key: string]: string }) => {
            const newValues = { ...prev, [key]: value }

            // Tự động tạo canonical từ name nếu đang nhập name và canonical chưa được chỉnh sửa thủ công
            if (key === 'name' && value && !canonicalManuallyEditedRef.current) {
                const slug = toSlug(value)
                newValues.canonical = slug
                setData('canonical', slug)
            }

            // Track khi user chỉnh sửa canonical thủ công
            if (key === 'canonical') {
                canonicalManuallyEditedRef.current = true
            }

            return newValues
        })
    }, [setData])

    const handleAutoTranslateChange = useCallback((checked: boolean) => {
        setIsAutoTranslate(checked)
        setData('auto_translate', checked)

        // Cập nhật auto_translate vào database ngay lập tức
        // Chỉ gửi auto_translate để tránh validation error và không update các field khác
        router.patch(
            getRoute('translate.update', { module, id: record.id, languageId: language.id }),
            {
                auto_translate: checked ? 1 : 0,
            },
            {
                preserveScroll: true,
                preserveState: false, // Reload data sau khi update để lấy giá trị mới từ database
                onSuccess: () => {
                    // Reload page để lấy data mới từ database (sau khi cache đã được invalidate)
                    router.reload({
                        only: ['translationData', 'record'],
                    })
                },
                onError: () => {
                    // Nếu có lỗi, revert lại state
                    setIsAutoTranslate(!checked)
                }
            }
        )
    }, [setData, module, record.id, language.id])

    const handlePreview = useCallback((fieldKey: string) => {
        setPreviewField(fieldKey)
    }, [])

    // Track button action để biết là "Lưu bản dịch" hay "Lưu và đóng"
    const buttonActionRef = useRef<'save' | 'save_and_close'>('save')

    const handleReset = () => {
        reset()
        setTranslationValues({
            name: safeTranslationData.name || '',
            description: safeTranslationData.description || '',
            content: safeTranslationData.content || '',
            canonical: safeTranslationData.canonical || '',
            meta_title: safeTranslationData.meta_title || '',
            meta_keyword: safeTranslationData.meta_keyword || '',
            meta_description: safeTranslationData.meta_description || '',
        })
    }

    const moduleLabels: { [key: string]: string } = {
        post: 'Bài Viết',
        product: 'Sản Phẩm',
        post_catalogue: 'Nhóm Bài Viết',
        product_catalogue: 'Nhóm Sản Phẩm',
    } as const

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: moduleLabels[module] || module,
            href: getRoute(`${module}.index`),
        },
        {
            title: 'Dịch nội dung',
            href: '/',
        }
    ]

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Dịch nội dung - ${language.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={`Dịch nội dung sang ${language.name}`}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container space-y-6">

                    {/* Language Flags */}
                    <CustomCard>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Ngôn ngữ đích</h3>
                                <div className="flex items-center gap-3">
                                    <img
                                        src={language.image}
                                        alt={language.name}
                                        className="w-8 h-6 object-cover rounded border"
                                    />
                                    <span className="font-medium">{language.name}</span>
                                </div>
                            </div>
                            <CustomLanguageFlags
                                languages={languages}
                                translatedLanguageIds={record.translated_language_ids || []}
                                postId={record.id}
                                module={module}
                                variant="page"
                            />
                        </div>
                    </CustomCard>

                    {/* Translation Mode Toggle */}
                    <CustomCard>
                        <div
                            className="flex items-center justify-between"
                            onClick={(e) => {
                                // Prevent any form submission
                                e.stopPropagation()
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-base font-medium">
                                        Dịch tự động bằng Google Translate
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Bật để đánh dấu bản ghi này sẽ được dịch tự động
                                    </p>
                                </div>
                            </div>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    e.preventDefault()
                                }}
                                className="cursor-pointer"
                            >
                                <Switch
                                    id="auto-translate"
                                    checked={isAutoTranslate}
                                    onCheckedChange={handleAutoTranslateChange}
                                    className="cursor-pointer"
                                />
                            </div>
                        </div>

                        {isAutoTranslate && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Nội dung sẽ được Google dịch tự động
                                    </p>
                                </div>
                            </div>
                        )}
                    </CustomCard>

                    {/* Translation Form - Ẩn khi auto translate */}
                    {!isAutoTranslate && (
                        <Form
                            action={getRoute('translate.store', { module, id: record.id, languageId: language.id })}
                            method="post"
                            options={{
                                preserveScroll: true,
                                preserveState: setPreserveState, // Dùng setPreserveState để hiển thị errors đúng cách
                            }}
                            transform={(data) => ({
                                ...data,
                                name: translationValues.name || '',
                                description: translationValues.description || '',
                                content: translationValues.content || '',
                                canonical: translationValues.canonical || '',
                                meta_title: translationValues.meta_title || '',
                                meta_keyword: translationValues.meta_keyword || '',
                                meta_description: translationValues.meta_description || '',
                                auto_translate: isAutoTranslate,
                                redirect_to: buttonActionRef.current === 'save_and_close' ? 'list' : undefined,
                            })}
                        >
                            {({ processing: formProcessing, errors: formErrors }) => {
                                // Merge formErrors vào errors để CustomTranslationFields có thể hiển thị
                                const mergedErrors = formErrors || errors

                                return (
                                    <>
                                        <CustomTranslationFields
                                            fields={translationFieldsConfig}
                                            values={translationValues}
                                            defaultValues={safeDefaultData as Record<string, string>}
                                            defaultLocale={defaultLocale}
                                            currentLocale={language.canonical}
                                            errors={mergedErrors}
                                            onChange={handleFieldChange}
                                            showDefaultValues={true}
                                            onPreview={handlePreview}
                                        />

                                        {/* Hidden inputs để Form component có thể collect data */}
                                        <input type="hidden" name="name" value={translationValues.name || ''} />
                                        <input type="hidden" name="description" value={translationValues.description || ''} />
                                        <input type="hidden" name="content" value={translationValues.content || ''} />
                                        <input type="hidden" name="canonical" value={translationValues.canonical || ''} />
                                        <input type="hidden" name="meta_title" value={translationValues.meta_title || ''} />
                                        <input type="hidden" name="meta_keyword" value={translationValues.meta_keyword || ''} />
                                        <input type="hidden" name="meta_description" value={translationValues.meta_description || ''} />
                                        <input type="hidden" name="auto_translate" value={isAutoTranslate ? '1' : '0'} />

                                        {/* Action Buttons */}
                                        <div className="mt-6 flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={formProcessing || processing}
                                                onClick={() => { buttonActionRef.current = 'save' }}
                                                className="bg-blue-600 hover:bg-blue-700 rounded-[5px] cursor-pointer"
                                            >
                                                {(formProcessing || processing) ? (
                                                    <>
                                                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                                                        Đang lưu...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Lưu bản dịch
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={formProcessing || processing}
                                                onClick={() => { buttonActionRef.current = 'save_and_close' }}
                                                className="bg-green-600 hover:bg-green-700 text-white rounded-[5px] cursor-pointer"
                                            >
                                                {(formProcessing || processing) ? (
                                                    <>
                                                        <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />
                                                        Đang lưu...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Lưu và đóng
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleReset}
                                                disabled={formProcessing || processing}
                                                className="rounded-[5px] cursor-pointer"
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => router.visit(getRoute(`${module}.index`))}
                                                disabled={formProcessing || processing}
                                                className="rounded-[5px] cursor-pointer"
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </>
                                )
                            }}
                        </Form>
                    )}

                    {/* Preview Dialog */}
                    <Dialog open={!!previewField} onOpenChange={() => setPreviewField(null)}>
                        <DialogContent className="wide-modal max-w-[calc(100%-4rem)] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Xem nội dung gốc</DialogTitle>
                            </DialogHeader>
                            {previewField && safeDefaultData[previewField as keyof TranslationData] && (
                                <div className="mt-4">
                                    <div
                                        className="prose max-w-none bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full"
                                        dangerouslySetInnerHTML={{
                                            __html: String(safeDefaultData[previewField as keyof TranslationData])
                                        }}
                                    />
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    )
}

