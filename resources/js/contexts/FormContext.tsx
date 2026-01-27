import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction, useMemo } from "react";

interface FormProviderProps {
    children: ReactNode,
    initData?: {
        name?: string,
        meta_title?: string,
        meta_keyword?: string,
        meta_description?: string,
        content?: string,
        description?: string,
        publish?: string
        robots?: string,
        canonical?: string,
        image?: string,
        parent_id?: number,
        gallery_style?: string,
        image_aspect_ratio?: string,
        image_object_fit?: string
    }
}

interface IFormContext {
    name: string,
    metaTitle: string,
    metaKeyword: string,
    metaDescription: string,
    canonical: string,
    content: string,
    description: string,
    selectedPublish: string,
    selectedRobots: string,
    displayMetaTitle: string,
    image: string,
    setName: Dispatch<SetStateAction<string>>,
    setMetaTitle: Dispatch<SetStateAction<string>>,
    setMetaDescription: Dispatch<SetStateAction<string>>,
    setCanonical: Dispatch<SetStateAction<string>>,
    setMetaKeyword: Dispatch<SetStateAction<string>>,
    setSelectedPublish: Dispatch<SetStateAction<string>>,
    setSelectedRobots: Dispatch<SetStateAction<string>>,
    setContent: Dispatch<SetStateAction<string>>,
    setDescription: Dispatch<SetStateAction<string>>,
    setImage: Dispatch<SetStateAction<string>>,
    parentId: number,
    setParentId: Dispatch<SetStateAction<number>>,
    imageAspectRatio: string,
    setImageAspectRatio: Dispatch<SetStateAction<string>>,
    galleryStyle: string,
    setGalleryStyle: Dispatch<SetStateAction<string>>,
    imageObjectFit: string,
    setImageObjectFit: Dispatch<SetStateAction<string>>,
}

export const FormContext = createContext<IFormContext | null>(null)

export function FormProvider({
    children,
    initData = {}
}: FormProviderProps) {

    const [name, setName] = useState<string>(initData.name || '')
    const [metaTitle, setMetaTitle] = useState<string>(initData.meta_title || '')
    const [metaKeyword, setMetaKeyword] = useState<string>(initData.meta_keyword || '')
    const [metaDescription, setMetaDescription] = useState<string>(initData.meta_description || '')
    const [content, setContent] = useState<string>(initData.content || '')
    const [description, setDescription] = useState<string>(initData.description || '')
    const [selectedPublish, setSelectedPublish] = useState<string>(initData.publish || '2')
    const [selectedRobots, setSelectedRobots] = useState<string>(initData.robots || 'index')
    const [canonical, setCanonical] = useState<string>(initData.canonical || '')
    const [image, setImage] = useState<string>(initData.image || '')
    const [parentId, setParentId] = useState<number>(initData.parent_id || 0)
    const [imageAspectRatio, setImageAspectRatio] = useState<string>(initData.image_aspect_ratio || '16:9')
    const [galleryStyle, setGalleryStyle] = useState<string>(initData.gallery_style || 'vertical')
    const [imageObjectFit, setImageObjectFit] = useState<string>(initData.image_object_fit || 'contain')

    useEffect(() => {
        if (initData.name !== undefined) setName(initData.name)
        if (initData.meta_title !== undefined) setMetaTitle(initData.meta_title)
        if (initData.meta_description !== undefined) setMetaDescription(initData.meta_description)
        if (initData.meta_keyword !== undefined) setMetaKeyword(initData.meta_keyword)
        if (initData.canonical !== undefined) setCanonical(initData.canonical)
        if (initData.publish !== undefined) setSelectedPublish(initData.publish)
        if (initData.robots !== undefined) setSelectedRobots(initData.robots)
        if (initData.description !== undefined) setDescription(initData.description)
        if (initData.content !== undefined) setContent(initData.content)
        if (initData.image !== undefined) setImage(initData.image)
        if (initData.parent_id !== undefined) setParentId(initData.parent_id)
        if (initData.image_aspect_ratio !== undefined) setImageAspectRatio(initData.image_aspect_ratio)
        if (initData.gallery_style !== undefined) setGalleryStyle(initData.gallery_style)
        if (initData.image_object_fit !== undefined) setImageObjectFit(initData.image_object_fit)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const displayMetaTitle = useMemo(() => metaTitle || name, [metaTitle, name])

    const contextValue = useMemo(() => ({
        name,
        metaTitle,
        metaKeyword,
        displayMetaTitle,
        metaDescription,
        canonical,
        content,
        description,
        selectedPublish,
        selectedRobots,
        image,
        setName,
        setMetaTitle,
        setMetaKeyword,
        setMetaDescription,
        setContent,
        setDescription,
        setSelectedPublish,
        setSelectedRobots,
        setCanonical,
        setImage,
        parentId,
        setParentId,
        imageAspectRatio,
        setImageAspectRatio,
        galleryStyle,
        setGalleryStyle,
        imageObjectFit,
        setImageObjectFit
    }), [
        name,
        metaTitle,
        metaKeyword,
        metaDescription,
        canonical,
        content,
        description,
        selectedPublish,
        selectedRobots,
        displayMetaTitle,
        image,
        parentId,
        imageAspectRatio,
        galleryStyle,
        imageObjectFit
    ])



    return (
        <FormContext.Provider
            value={contextValue}
        >
            {children}
        </FormContext.Provider>
    )
}

export const useFormContext = (): IFormContext => {
    const context = useContext(FormContext)
    if (!context) {
        throw new Error('Error')
    }
    return context
}