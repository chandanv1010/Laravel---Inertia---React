// import { useEffect } from "react"
import React, { useCallback, useEffect, useRef } from "react";
import CustomCard from "./custom-card"
import {  CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from "react";
import { Button } from "./ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { loadCkfinder } from "@/lib/ckfinder-loader"
import SortableWrapper from "./sortable/SortableWrapper";
import { useSortable } from "@dnd-kit/sortable";
import {CSS} from '@dnd-kit/utilities';


interface ICustomAlbumProps {
    data?: string[],
    onDataChange: (images: string[]) => void
    hideHeader?: boolean
    columns?: number
}

type TAllFile = {
    url: string,
    [key: string]: string
}

export type TPhoto = {
    id: string,
    url: string
}

type CKFinderFinder = {
    resourceType?: string
    selectActionFunction?: (fileUrl: string, data: unknown, allFiles: TAllFile[]) => void
    popup: () => void
}

type CKFinderConstructor = {
    new (): CKFinderFinder
}

type WindowWithCKFinder = Window & {
    CKFinder?: CKFinderConstructor
}

const ImageItem =  React.memo(({
    id,
    src,
    onRemove,
}: {
    id: string
    src: string,
    onRemove?: () => void

}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef} style={style} 
            className="relative group rounded-[5px] overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer">
            <img 
                src={src} 
                loading="lazy" 
                className="object-cover w-full h-[150px] border-0 outline-none" 
                style={{ display: 'block' }}
            />
            
            <div 
                {...attributes}
                {...listeners}
                className="
                    absolute top-1 right-[10px] z-10
                    flex items-center justify-center
                    w-8 h-8
                    rounded-[2px]
                    bg-transparent
                    opacity-0
                    group-hover:opacity-100
                    group-hover:bg-[#eaeaea]
                    transition-all
                    cursor-grab
                    active:cursor-grabbing
                    touch-none
                    select-none
                "
            >
                <GripVertical className="w-4 h-4 text-gray-600 pointer-events-none" />
            </div>
            
            <Button 
                type="button"
                onClick={onRemove} 
                variant="destructive"
                className="absolute top-1 right-[50px] h-8 w-8 bg-red-500 text-white text-xs px-2 py-1 rounded-[2px] opacity-0 group-hover:opacity-100 transition hover:bg-amber-400 cursor-pointer"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    )
})

export default function CustomAlbum({
    data,
    onDataChange,
    hideHeader = false,
    columns = 5
}: ICustomAlbumProps){

    const [images, setImages] = useState<TPhoto[]>([])
    const isFirstRender = useRef<boolean>(true)
    const isInternalUpdate = useRef<boolean>(false)
    const dataRef = useRef<string | null>(null)

    const handleRemove = useCallback((id: string) => {
        isInternalUpdate.current = true
        setImages(prev => prev.filter(img => img.id !== id))
    }, [])

    useEffect(() => {
        // Only update from props if data actually changed
        const dataKey = data ? JSON.stringify([...data].sort()) : 'empty'
        if (dataRef.current === dataKey) {
            return // No change
        }
        
        dataRef.current = dataKey
        
        if(data && data.length > 0){
            isInternalUpdate.current = false
            const currentUrls = images.map(img => img.url).sort().join(',')
            const newUrls = [...data].sort().join(',')
            if (currentUrls !== newUrls) {
                setImages(data.map(url => ({
                    id: crypto.randomUUID(),
                    url
                })))
            }
        } else if ((!data || data.length === 0) && images.length > 0) {
            isInternalUpdate.current = false
            setImages([])
        }
    }, [data])

    const openFinder = async () => {
        try {
            await loadCkfinder()
            // @ts-ignore - CKFinder is a third-party library, allow any type
            const CKFinder = (window as any).CKFinder
        if(CKFinder){
                // @ts-ignore - CKFinder is a third-party library, allow any type
            const finder = new CKFinder();
                // @ts-ignore - CKFinder is a third-party library, allow any type
                if(finder){
                    // @ts-ignore - CKFinder is a third-party library, allow any type
                    finder.basePath = '/plugins/ckfinder_2/';
                    // @ts-ignore - CKFinder is a third-party library, allow any type
            finder.resourceType = 'Images';
                    // @ts-ignore - CKFinder is a third-party library, allow any type
            finder.selectActionFunction = function( fileUrl: string, data: unknown, allFiles: TAllFile[]) {
                isInternalUpdate.current = true
                setImages(prev => [
                    ...prev,
                    ...allFiles.map(file => ({
                        id: crypto.randomUUID(),
                        url: file.url
                    }))
                ]);
            }
                    // @ts-ignore - CKFinder is a third-party library, allow any type
            finder.popup();
                }
            }
        } catch (error) {
            console.error('CKFinder error:', error)
        }
    }

    // Only call onDataChange when images change from user action (not prop update)
    useEffect(() => {
        if(!data && isFirstRender.current){
            isFirstRender.current = false
            return
        }
        
        // Only notify parent if change was from user action
        if (isInternalUpdate.current) {
            const imageUrls = images.map(image => image.url)
            onDataChange(imageUrls)
            isInternalUpdate.current = false
        }
    }, [images, onDataChange, data])

    useEffect(() => {
        loadCkfinder()
    }, [])
    

    return (
        <CustomCard
            isShowHeader={!hideHeader}
            title="Album Hình Ảnh"
            className={hideHeader ? "!pt-0" : ""}
            headerChildren={
                !hideHeader ? (
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between pb-[15px]">
                            <CardTitle className="uppercase">Album Hình Ảnh</CardTitle>
                            <span onClick={openFinder} className="cursor-pointer bg-transparent border-0 text-[blue] p-0 text-[14px]">+ Thêm mới hình ảnh</span>
                        </div>
                    </CardHeader>
                ) : undefined
            }
        >
            {hideHeader && (
                <div className="mb-4 flex justify-end px-6 pt-4">
                    <span onClick={openFinder} className="cursor-pointer bg-transparent border-0 text-[blue] p-0 text-[14px]">+ Thêm mới hình ảnh</span>
                </div>
            )}
            {images && images.length > 0 ? (
                <div className={hideHeader ? "px-6" : ""}>
                    <SortableWrapper 
                        items={images} 
                        setItems={(newOrder) => {
                            isInternalUpdate.current = true
                            setImages(newOrder)
                        }}
                        columns={columns}
                    >
                        {images.map((photo) => (
                            <ImageItem 
                                src={photo.url}
                                key={photo.id}
                                id={photo.id}
                                onRemove={() => handleRemove(photo.id)}
                            />
                        ))}
                    </SortableWrapper>
                </div>
                
            ): (
                <div className="click-to-upload cursor-pointer flex flex-col items-center justify-center p-[15px] border-dashed border-1 rounded-[5px] m-[15px]" onClick={openFinder}>
                    <svg className="w-[80px] h-[80px] fill-[#d3dbe2] mb-[10px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
                        <path d="M80 57.6l-4-18.7v-23.9c0-1.1-.9-2-2-2h-3.5l-1.1-5.4c-.3-1.1-1.4-1.8-2.4-1.6l-32.6 7h-27.4c-1.1 0-2 .9-2 2v4.3l-3.4.7c-1.1.2-1.8 1.3-1.5 2.4l5 23.4v20.2c0 1.1.9 2 2 2h2.7l.9 4.4c.2.9 1 1.6 2 1.6h.4l27.9-6h33c1.1 0 2-.9 2-2v-5.5l2.4-.5c1.1-.2 1.8-1.3 1.6-2.4zm-75-21.5l-3-14.1 3-.6v14.7zm62.4-28.1l1.1 5h-24.5l23.4-5zm-54.8 64l-.8-4h19.6l-18.8 4zm37.7-6h-43.3v-51h67v51h-23.7zm25.7-7.5v-9.9l2 9.4-2 .5zm-52-21.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm-13-10v43h59v-43h-59zm57 2v24.1l-12.8-12.8c-3-3-7.9-3-11 0l-13.3 13.2-.1-.1c-1.1-1.1-2.5-1.7-4.1-1.7-1.5 0-3 .6-4.1 1.7l-9.6 9.8v-34.2h55zm-55 39v-2l11.1-11.2c1.4-1.4 3.9-1.4 5.3 0l9.7 9.7c-5.2 1.3-9 2.4-9.4 2.5l-3.7 1h-13zm55 0h-34.2c7.1-2 23.2-5.9 33-5.9l1.2-.1v6zm-1.3-7.9c-7.2 0-17.4 2-25.3 3.9l-9.1-9.1 13.3-13.3c2.2-2.2 5.9-2.2 8.1 0l14.3 14.3v4.1l-1.3.1z">
                        </path>
                    </svg>
                    <span className="text-sm">Click vào để upload hình ảnh</span>
                </div>
            )}
        </CustomCard>
    )
}