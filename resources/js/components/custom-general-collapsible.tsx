import CustomCard from "@/components/custom-card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import InputError from "@/components/input-error"
import EditorPage from '@/components/editor'
import { useFormContext } from "@/contexts/FormContext"
import { memo, useCallback, useState } from "react"

interface ICustomGeneralCollapsibleProps {
    name?: string
    errors?: Record<string, string>
    description?: string
    content?: string
    isShowContent?: boolean
    isShowDescription?: boolean
    className?: string
    onLoadDemo?: () => void
}

const CustomGeneralCollapsible = ({
    name,
    description,
    content,
    errors,
    isShowContent = true,
    isShowDescription = true,
    className,
    onLoadDemo
}: ICustomGeneralCollapsibleProps) => {
    const {
        name: formName,
        setName,
        setContent,
        setDescription,
        setCanonical,
        setMetaTitle,
        setMetaKeyword,
        setMetaDescription,
    } = useFormContext()
    const [showContent, setShowContent] = useState(!!content)

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value)
    }, [setName])

    const handleDescriptionChange = useCallback((data: string) => {
        setDescription(data)
    }, [setDescription])

    const handleContentChange = useCallback((data: string) => {
        setContent(data)
    }, [setContent])

    const handleLoadDemo = useCallback(() => {
        const seed = Date.now()
        const demoName = `DEMO Product ${seed}`
        const demoCanonical = `demo-product-${seed}`

        setName(demoName)
        setDescription(`<p>Mô tả demo cho sản phẩm <strong>${demoName}</strong>.</p>`)
        setContent(`<p>Nội dung demo cho sản phẩm <strong>${demoName}</strong>.</p>`)
        setCanonical(demoCanonical)
        setMetaTitle(`SEO ${demoName}`)
        setMetaKeyword(`demo,product,${seed}`)
        setMetaDescription(`Mô tả SEO demo cho ${demoName}`)

        onLoadDemo?.()
    }, [onLoadDemo, setCanonical, setContent, setDescription, setMetaDescription, setMetaKeyword, setMetaTitle, setName])

    return (
        <CustomCard
            isShowHeader={true}
            title="Thông tin chung"
            className={className}
        >
            <div className="grid grid-cols-1 gap-4 mb-[20px]">
                <div className="col-span-1">
                    <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="name" className="block">Tiêu đề</Label>
                        {onLoadDemo && (
                            <button
                                type="button"
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                onClick={handleLoadDemo}
                            >
                                Load demo
                            </button>
                        )}
                    </div>
                    <Input
                        id="name"
                        type="text"
                        name="name"
                        data-testid="product-name"
                        autoFocus
                        tabIndex={1}
                        autoComplete=""
                        placeholder=""
                        value={formName}
                        onChange={handleNameChange}
                    />
                    <InputError message={errors?.name} className="mt-[5px]" />
                </div>
            </div>

            {/* Description - always visible, shorter height */}
            {isShowDescription && (
                <div className="grid grid-cols-1 gap-4 mb-[20px]">
                    <div className="col-span-1">
                        <Label htmlFor="description" className="mb-2 block">Mô Tả</Label>
                        <EditorPage
                            name="description"
                            height={200}
                            value={description}
                            onChange={handleDescriptionChange}
                        />
                    </div>
                </div>
            )}

            {/* Content - collapsible */}
            {isShowContent && (
                <div className="grid grid-cols-1 gap-4">
                    <div className="col-span-1">
                        <div className="flex items-center justify-between mb-2">
                            <Label htmlFor="content">Nội dung</Label>
                            <button
                                type="button"
                                onClick={() => setShowContent(!showContent)}
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                                {showContent ? 'Ẩn chi tiết' : 'Mở chi tiết'}
                            </button>
                        </div>
                        {showContent && (
                            <EditorPage
                                name="content"
                                height={500}
                                value={content}
                                onChange={handleContentChange}
                            />
                        )}
                    </div>
                </div>
            )}
        </CustomCard>
    )
}

export default memo(CustomGeneralCollapsible)
