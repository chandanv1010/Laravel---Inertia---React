
import CustomCard from "./custom-card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import InputError from "./input-error"
import { Textarea } from "./ui/textarea"
import { usePage } from "@inertiajs/react"
import { type SharedData } from '@/types';
import { useFormContext } from "@/contexts/FormContext"
// import { useEffect } from "react"
// import {  useState } from "react"
import { useMemo, memo } from "react"
import { toSlug } from "@/lib/helper"

type TSeoBase = {
    // Flat structure (new)
    meta_title?: string,
    meta_description?: string,
    canonical?: string,
    name?: string,
    meta_keyword?: string,
    // Nested structure (backward compatible)
    current_language?: {
        meta_title?: string,
        meta_description?: string,
        canonical?: string,
        name?: string,
        meta_keyword?: string
    }
}

interface ISeoProps<T extends TSeoBase> {
    record?: T,
    errors?: Record<string, string>
}

const SUFFIX = '.html'
const META_TITLE_LIMIT = 71
const META_DESCRIPTION_LIMIT = 300


function Seo<T extends TSeoBase>({
    record,
    errors
}: ISeoProps<T>) {

    const { app } = usePage<SharedData>().props
    const {
        setMetaTitle,
        setMetaDescription,
        setMetaKeyword,
        setCanonical,
        metaDescription,
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
        <CustomCard
            isShowHeader={true}
            title="Cấu Hình Seo"
            description="Nhập đầy đủ thông tin dưới dây"
            className="mt-[20px]"
        >
            <div className="seo-preview bg-blue-400/10 rounded-[5px] p-[10px] mb-[20px]">
                <div className="text-[blue] mb-[5px] text-[20px]">{displayMetaTitle || 'Bạn chưa nhập Tiêu Đề SEO'}</div>
                <div className="text-[green] mb-[5px] text-[15px]">{app.url}{toSlug(displayCanonical)}{SUFFIX}</div>
                <div className="text-gray-700 text-[14px]">
                    {(metaDescription ?? '').length > 0 ? metaDescription : 'Bạn chưa nhập vào mô tả SEO'}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-[20px]">
                <div className="col-span-1">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="meta_title" className="mb-[10px]">Tiêu đề SEO</Label>
                        <span className={`text-[12px] ${metaTitleOver ? 'text-red-500' : ''}`}><span>{metaTitleLength}</span>/{META_TITLE_LIMIT}</span>
                    </div>
                    <Input
                        id="meta_title"
                        type="text"
                        name="meta_title"
                        tabIndex={1}
                        autoComplete="off"
                        placeholder=""
                        defaultValue={record?.meta_title || record?.current_language?.meta_title}
                        onChange={(e) => setMetaTitle(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-[20px]">
                <div className="col-span-1">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="meta_keyword" className="mb-[10px]">Từ khóa SEO</Label>
                    </div>
                    <Input
                        id="meta_keyword"
                        type="text"
                        name="meta_keyword"
                        tabIndex={1}
                        autoComplete="off"
                        placeholder=""
                        defaultValue={record?.meta_keyword || record?.current_language?.meta_keyword}
                        onChange={(e) => setMetaKeyword(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-[20px]">
                <div className="col-span-1">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="meta_description" className="mb-[10px]">Mô tả SEO</Label>
                        <span className={`text-[12px] ${metaDescriptionOver ? 'text-red-500' : ''}`}><span>{metaDescriptionLength}</span>/{META_DESCRIPTION_LIMIT}</span>
                    </div>
                    <Textarea
                        id="meta_description"
                        name="meta_description"
                        tabIndex={1}
                        autoComplete="off"
                        className="h-[160px]"
                        placeholder=""
                        defaultValue={record?.meta_description || record?.current_language?.meta_description}
                        onChange={(e) => setMetaDescription(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <div className="col-span-1">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="canonical" className="mb-[10px]">Đường dẫn</Label>
                    </div>
                    <div className="relative">
                        <span className="base-url">{app.url}</span>
                        <Input
                            id="canonical"
                            type="text"
                            name="canonical"
                            tabIndex={1}
                            autoComplete="off"
                            placeholder=""
                            defaultValue={displayCanonical}
                            className="pl-[150px]"
                            onChange={(e) => setCanonical(e.target.value)}
                        />
                    </div>
                    {errors && <InputError message={errors.canonical} className="mt-[5px]" />}
                </div>
            </div>

        </CustomCard>
    )
}

export default memo(Seo, (prevProps, nextProps) => {
    const recordChange = JSON.stringify(prevProps.record) !== JSON.stringify(nextProps.record)
    const errorChange = JSON.stringify(prevProps.errors) !== JSON.stringify(nextProps.errors)

    return !recordChange && !errorChange
}) as typeof Seo