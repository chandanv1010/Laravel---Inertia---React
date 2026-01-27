import CustomCard from "./custom-card"
import {  CardHeader, CardTitle } from '@/components/ui/card';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
// import { router } from "@inertiajs/react";
import axios, { AxiosError } from "axios";
import type { TApiMessage } from "@/types";
import { GripVertical, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import SortableWrapper from "./sortable/SortableWrapper";
import { useSortable } from "@dnd-kit/sortable";
import {CSS} from '@dnd-kit/utilities';
import type { TPhoto } from "./custom-album";


export type TUploadedFile = {
    id: string,
    url: string,
    // originalName: string,
    size: number,
    progress: number,
    status: 'uploading' | 'success' | 'error',
    error?: string,
    isTemp?: boolean,
    serverId?: string
}

export type TServerUploadedFile = {
    url: string,
    id: string
}

const ImageItem = React.memo(({
    file,
    index,
    onRemove
}: {
    file: TUploadedFile,
    index: number,
    onRemove?: (e?: React.MouseEvent) => void
}) => {
    const isUploading = file.status === 'uploading'
    const isError = file.status === 'error'
    const isSucess = file.status === 'success'

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: file.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div  
            className="relative group rounded-[5px] overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer"
            ref={setNodeRef}
            style={style}
        >
            <img alt={`Upload-${index + 1}`} src={file.url} loading="lazy" className={`object-cover w-full h-[150px] transition-opacity duration-300  ${isUploading ? 'opacity-30' : 'opacity-100'}`} />
            {isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-3/4 mb-2">
                        <Progress 
                            value={file.progress}
                            className="h-2 bg-gray-200"
                        />
                    </div>
                    <span className="text-white text-xs font-medium">{file.progress}%</span>
                </div>
            )}

            {isError && (
                <div className="absolute inset-0 bg-red-500 opacity-50 flex flex-col items-center justify-center">
                    <AlertCircle className="text-white size-6 mb-[10px]" />
                    <span className="text-white text-xs text-center px-2">Upload Failed</span>
                </div>
            )}

            {isSucess && (
                <div className="absolute top-2 left-2">
                    <CheckCircle className="text-white bg-green-400 size-5 mb-[10px] rounded-full" />
                </div>
            )}

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
                    cursor-move
                ">
                    <GripVertical className="w-4 h-4 text-gray-600" />
            </div>
            
            <Button type="button" onClick={onRemove} variant="destructive" className="absolute top-1 right-[50px] h-8 w-8 bg-red-500 text-white text-xs px-2 py-1 rounded-[2px] opacity-0 group-hover:opacity-100 transition hover:bg-amber-400 cursor-pointer"><Trash2 size={3} /></Button>
        </div>
    )
})



interface CustomAlbumDirectUploadProps {
    data?: string[],
    sessionId?: string,
    onDataChange?: (urls: string[]) => void
}

const CustomAlbumDirectUpload = ({
    data = [],
    sessionId: propSessionId,
    onDataChange
}: CustomAlbumDirectUploadProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null)
    const sessionIdRef = useRef<string>(propSessionId || `session-${crypto.randomUUID()}`)
    const sessionId = sessionIdRef.current


    const [uploadingFiles, setUploadingFiles] = useState<Map<string, TUploadedFile>>(new Map())
    const [permanentFiles, setPermanentFiles] = useState<Map<string, TUploadedFile>>(new Map())
    const [photos, setPhotos] = useState<TPhoto[]>([])

    useEffect(() => {
        if(data && data.length){
            const permanent = new Map<string, TUploadedFile>()
            data.forEach((url, index) => {
                const id = `permanet-${index}-${url}`
                permanent.set(id, {
                    id,
                    url,
                    size: 0,
                    progress: 100,
                    status: 'success',
                    isTemp: false
                })
            })
            setPermanentFiles(permanent)
        }
    }, [data])

    useEffect(() => {
        if(onDataChange){
            const allUrls = Array.from(permanentFiles.values())
            .map(f => f.url)
            .concat(
                Array.from(uploadingFiles.values())
                .filter(f => f.status === 'success')
                .map(f => f.url)
            )
            onDataChange(allUrls)
        }
    }, [permanentFiles, uploadingFiles, onDataChange])


    const allImages: TUploadedFile[] = useMemo(() => {
        const permanent: TUploadedFile[] = Array.from(permanentFiles.values())
        const uploading: TUploadedFile[] = Array.from(uploadingFiles.values())
        return [...permanent, ...uploading] as TUploadedFile[]
    }, [permanentFiles, uploadingFiles])

    useEffect(() => {
        const newPhotos: TPhoto[] = allImages.map(file => ({
            id: file.id,
            url: file.url
        }))
        const currentIds = photos.map(p => p.id).join(',')
        const newIds = newPhotos.map(p => p.id).join(',')
        if(currentIds !== newIds){
            setPhotos(newPhotos)
        }
    }, [allImages, photos])

    const handlePhotosChange = useCallback((newPhotos: TPhoto[]) => {

        const imageMap = new Map<string, TUploadedFile>()
        allImages.forEach(file => {
            imageMap.set(file.id, file)
        })

        const reorderd: TUploadedFile[] = newPhotos.map(photo => imageMap.get(photo.id)).filter((file): file is TUploadedFile => file != undefined)
        const newPermanent = new Map<string, TUploadedFile>()
        const newUploading = new Map<string, TUploadedFile>()

        reorderd.forEach(file => {
            if(file.isTemp){
                newUploading.set(file.id, file)
            }else{
                newPermanent.set(file.id, file)
            }
        })

        setPermanentFiles(newPermanent)
        setUploadingFiles(newUploading)

    }, [allImages])

    const hasImage = useMemo(() => allImages.length > 0, [allImages])


    const handleFileChange = async (fileList: FileList | null) => {
        if(!fileList || fileList.length === 0) return

        const validFiles: File[] = []
        Array.from(fileList).forEach(file => {
            if(!file.type.startsWith('image/')){
                toast.error(`File ${file.name} không phải là ảnh`)
                return
            }
            if(file.size > 2 * 1024 * 1024){
                toast.error(`File ${file.name} vượt quá dung lượng cho phép`)
                return
            }
            validFiles.push(file)
        })

        if(validFiles.length === 0) return
        const dataTranfer = new DataTransfer()
        validFiles.forEach(file => dataTranfer.items.add(file))
        await uploadFiles(dataTranfer.files, sessionId)
        if(fileInputRef.current){
            fileInputRef.current.value = ''
        }
    }

    const uploadFiles = async (files: FileList, sessionId: string) => {
        const fileArray = Array.from(files)
        const uploadTasks = fileArray.map(async(file) => {
            const fileId = crypto.randomUUID()
            const uploadFile: TUploadedFile = {
                id: fileId,
                url: URL.createObjectURL(file),
                size: file.size,
                progress: 0,
                status: 'uploading'
            }
            setUploadingFiles(prev => new Map(prev.set(fileId, uploadFile)))
            await uploadSingleFile(file, fileId, sessionId)
        })
        await Promise.all(uploadTasks)
    }

    const uploadSingleFile = async (file: File, fileId: string, sessionId: string): Promise<void> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('session_id', sessionId)

        try {

            const response = await axios.post('/upload-image-temp', formData, {
                headers: {
                    "Content-Type" : "multipart/form-data"
                },
                onUploadProgress: (event) => {
                        if(!event || !event.total) return
                    const percent = Math.round((event.loaded * 100)/event.total)
                    setUploadingFiles(prev => {
                        const newMap = new Map(prev)
                        const f = newMap.get(fileId)
                        if(!f) return prev
                        newMap.set(fileId, {
                            ...f,
                            progress: percent
                        })
                        return newMap
                    })
                }
            })
            const uploadedFile = response.data.data as TServerUploadedFile
            setUploadingFiles(prev => {
                const newMap = new Map(prev)
                const f = newMap.get(fileId)
                if(!f) return prev
                newMap.set(fileId, {
                    ...f,
                    progress: 100,
                    status: 'success',
                    url: uploadedFile.url || f.url,
                    isTemp: true,
                    serverId: uploadedFile.id
                })
                return newMap
            })
        } catch (error: unknown){
            const axiosError = error as AxiosError<TApiMessage>
            setUploadingFiles(prev => {
                const newMap = new Map(prev)
                const f = newMap.get(fileId)
                if(!f) return prev

                newMap.set(fileId, {
                    ...f,
                    status: 'error',
                    error: axiosError.response?.data.message || 'Upload File Không Thành Công'
                })
                return newMap
            })
        }
        
    }


    const handleRemove = (file: TUploadedFile, event?: React.MouseEvent) => {
        if(event){
            event.preventDefault()
            event.stopPropagation()
        }

        const backupFile = {...file}

        if(file.isTemp){
            setUploadingFiles(prev => {
                const newMap = new Map(prev)
                newMap.delete(file.id)
                return newMap
            })
        }else{
            setPermanentFiles(prev => {
                const newMap = new Map(prev)
                newMap.delete(file.id)
                return newMap
            })
        }
        
        if(file.url.startsWith('blob:')){
            URL.revokeObjectURL(file.url)
        }

        if(file.isTemp){
            axios.delete('/upload-image-temp/temp', {
                data: {
                    session_id: sessionId,
                    filepath: file.url.replace('/storage', '')
                }
            }).catch((error) => {
                console.error('Không thể xóa file từ Servier: ', error)
                toast.error('Có vấn đề xảy ra, Hãy thử lại sau')
                if(backupFile.isTemp){
                    setUploadingFiles(prev => {
                        const newMap = new Map(prev) 
                        newMap.set(backupFile.id, backupFile)
                        return newMap
                    })
                }
            })
        }

    }
    
    return (
        <CustomCard
            isShowHeader={true}
            title="Album Hình Ảnh"
            headerChildren={
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between pb-[15px]">
                        <CardTitle className="uppercase">Album Hình Ảnh</CardTitle>
                        <span className="cursor-pointer bg-transparent border-0 text-[blue] p-0 text-[14px]" onClick={() => fileInputRef.current?.click()}>+ Thêm mới hình ảnh</span>
                    </div>
                </CardHeader>
            }
        >
            <input 
                type="file" 
                accept="images/*"
                multiple
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files)}
            />
            {hasImage ? (

                <SortableWrapper
                    items={photos}
                    setItems={handlePhotosChange}
                >
                    {allImages.map((file, index) => (
                        <ImageItem 
                            file={file}
                            key={file.id}
                            index={index}
                            onRemove={(e) => handleRemove(file, e)}
                        />
                    ))}
                </SortableWrapper>
                
            ): (
                <div  
                    onClick={() => fileInputRef.current?.click()}
                    className="click-to-upload cursor-pointer flex flex-col items-center justify-center p-[10px] border-dashed border-1 rounded-[5px]">
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

export default CustomAlbumDirectUpload