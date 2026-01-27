import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import InputError from "@/components/input-error"
import { usePage } from "@inertiajs/react"
import { type SharedData } from '@/types'
import { useFormContext } from "@/contexts/FormContext"
import { useMemo } from "react"
import { toSlug } from "@/lib/helper"

const SUFFIX = '.html'
const META_TITLE_LIMIT = 71
const META_DESCRIPTION_LIMIT = 300

interface SeoSectionProps {
    record?: unknown
    errors?: Record<string, string>
}

export function SeoSection({ errors }: SeoSectionProps) {
    const { app } = usePage<SharedData>().props
    const {
        setMetaTitle,
        setMetaDescription,
        setMetaKeyword,
        setCanonical,
        metaDescription,
        metaTitle,
        metaKeyword,
        displayMetaTitle,
        canonical,
        name
    } = useFormContext()

    const displayCanonical = useMemo(() => canonical || toSlug(name), [canonical, name])
    const metaTitleLength = useMemo(() => (displayMetaTitle || '').length, [displayMetaTitle])
    const metaDescriptionLength = useMemo(() => (metaDescription || '').length, [metaDescription])
    const metaTitleOver = useMemo(() => metaTitleLength > META_TITLE_LIMIT, [metaTitleLength])
    const metaDescriptionOver = useMemo(() => metaDescriptionLength > META_DESCRIPTION_LIMIT, [metaDescriptionLength])

    return (
        <div className="mb-[20px] bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-medium">Tối ưu SEO</h3>
            </div>

            <div className="mt-4 pt-4 border-t">
                {/* SEO Preview */}
                <div className="seo-preview bg-blue-400/10 rounded-[5px] p-[10px] mb-[20px]">
                    <div className="text-[blue] mb-[5px] text-[18px]">{displayMetaTitle || 'Bạn chưa nhập Tiêu Đề SEO'}</div>
                    <div className="text-[green] mb-[5px] text-[13px]">{app.url}{toSlug(displayCanonical)}{SUFFIX}</div>
                    <div className="text-gray-700 text-[13px]">
                        {(metaDescription ?? '').length > 0 ? metaDescription : 'Bạn chưa nhập vào mô tả SEO'}
                    </div>
                </div>

                {/* Meta Title */}
                <div className="mb-[15px]">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="meta_title" className="mb-[8px]">Tiêu đề SEO</Label>
                        <span className={`text-[12px] ${metaTitleOver ? 'text-red-500' : ''}`}>{metaTitleLength}/{META_TITLE_LIMIT}</span>
                    </div>
                    <Input
                        id="meta_title"
                        type="text"
                        name="meta_title"
                        tabIndex={1}
                        value={metaTitle ?? ""}
                        onChange={(e) => setMetaTitle(e.target.value)}
                    />
                </div>

                {/* Meta Keyword */}
                <div className="mb-[15px]">
                    <Label htmlFor="meta_keyword" className="mb-[8px] block">Từ khóa SEO</Label>
                    <Input
                        id="meta_keyword"
                        type="text"
                        name="meta_keyword"
                        tabIndex={1}
                        value={metaKeyword ?? ""}
                        onChange={(e) => setMetaKeyword(e.target.value)}
                    />
                </div>

                {/* Meta Description */}
                <div className="mb-[15px]">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="meta_description" className="mb-[8px]">Mô tả SEO</Label>
                        <span className={`text-[12px] ${metaDescriptionOver ? 'text-red-500' : ''}`}>{metaDescriptionLength}/{META_DESCRIPTION_LIMIT}</span>
                    </div>
                    <Textarea
                        id="meta_description"
                        name="meta_description"
                        tabIndex={1}
                        className="h-[120px]"
                        value={metaDescription ?? ""}
                        onChange={(e) => setMetaDescription(e.target.value)}
                    />
                </div>

                {/* Canonical */}
                <div>
                    <Label htmlFor="canonical" className="mb-[8px] block">Đường dẫn</Label>
                    <div className="relative">
                        <span className="base-url">{app.url}</span>
                        <Input
                            id="canonical"
                            type="text"
                            name="canonical"
                            tabIndex={1}
                            value={displayCanonical}
                            className="pl-[150px]"
                            onChange={(e) => setCanonical(e.target.value)}
                            data-testid="product-canonical"
                        />
                    </div>
                    {errors && <InputError message={errors.canonical} className="mt-[5px]" />}
                </div>
            </div>
        </div>
    )
}
