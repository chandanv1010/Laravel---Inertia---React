import { useMemo } from "react"

interface IUsePageProps<T> { // UserCatalgoue
    record: T | undefined
}

interface BaseSeoScore {
    id: number,
    publish?: string
    robots?: string,
    image?: string,
    gallery_style?: string,
    image_aspect_ratio?: string,
    image_object_fit?: string,
    current_language?: {
        name?: string,
        meta_title?: string,
        meta_keyword?: string,
        meta_description?: string,
        content?: string,
        description?: string,
        canonical?: string
    }

}

const usePageSetup = <T extends BaseSeoScore>({
    record
}: IUsePageProps<T>) => {


    const initData = useMemo(() => ({
        name: record?.current_language?.name,
        meta_title: record?.current_language?.meta_title,
        meta_description: record?.current_language?.meta_description,
        meta_keyword: record?.current_language?.meta_keyword,
        canonical: record?.current_language?.canonical,
        description: record?.current_language?.description,
        content: record?.current_language?.content,
        robots: record?.robots,
        publish: record?.publish,
        image: record?.image,
        gallery_style: record?.gallery_style,
        image_aspect_ratio: record?.image_aspect_ratio,
        image_object_fit: record?.image_object_fit
    }), [
        record?.current_language?.name,
        record?.current_language?.meta_title,
        record?.current_language?.meta_description,
        record?.current_language?.meta_keyword,
        record?.current_language?.canonical,
        record?.current_language?.description,
        record?.current_language?.content,
        record?.robots,
        record?.publish,
        record?.image,
        record?.gallery_style,
        record?.image_aspect_ratio,
        record?.image_object_fit
    ])

    return {
        initData
    }
}

export default usePageSetup

