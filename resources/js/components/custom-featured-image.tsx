import { useContext, useEffect, memo } from "react"
import { loadCkfinder } from "@/lib/ckfinder-loader"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { X } from "lucide-react"
import { FormContext } from "@/contexts/FormContext"

type CKFinderFinder = {
    resourceType?: string
    selectActionFunction?: (fileUrl: string) => void
    popup: () => void
}

type CKFinderConstructor = {
    new(): CKFinderFinder
}

type WindowWithCKFinder = Window & {
    CKFinder?: CKFinderConstructor
}

interface ICustomFeaturedImageProps {
    name?: string
    value?: string
    // Support controlled mode (used by variant detail page)
    data?: string
    onDataChange?: (value: string) => void
}
function CustomFeaturedImage({
    name = 'image',
    value = '',
    data,
    onDataChange,
}: ICustomFeaturedImageProps) {

    // Use useContext directly to avoid throwing error if Provider is missing
    const formContext = useContext(FormContext)

    // Determine if using controlled mode (data/onDataChange) or FormContext mode
    const isControlled = onDataChange !== undefined

    // If not controlled and no context, we can't function properly, but let's avoid crashing or default to empty
    const currentImage = isControlled ? (data || '') : (formContext?.image || '')
    const updateImage = isControlled ? onDataChange : (formContext?.setImage || (() => { }))

    const openFinder = async () => {
        try {
            await loadCkfinder()
            // @ts-ignore - CKFinder is a third-party library, allow any type
            const CKFinder = (window as any).CKFinder
            if (CKFinder) {
                // @ts-ignore - CKFinder is a third-party library, allow any type
                const finder = new CKFinder();
                // @ts-ignore - CKFinder is a third-party library, allow any type
                if (finder) {
                    // @ts-ignore - CKFinder is a third-party library, allow any type
                    finder.basePath = '/plugins/ckfinder_2/';
                    // @ts-ignore - CKFinder is a third-party library, allow any type
                    finder.resourceType = 'Images';
                    // @ts-ignore - CKFinder is a third-party library, allow any type
                    finder.selectActionFunction = function (fileUrl: string) {
                        updateImage(fileUrl)
                    }
                    // @ts-ignore - CKFinder is a third-party library, allow any type
                    finder.popup();
                }
            }
        } catch (error) {
            console.error('CKFinder error:', error)
        }
    }

    const handleRemove = () => {
        updateImage('')
    }

    // Only sync from value prop in FormContext mode
    useEffect(() => {
        if (!isControlled && value && formContext?.setImage) formContext.setImage(value)
    }, [value, formContext?.setImage, isControlled])

    useEffect(() => {
        loadCkfinder()
    }, [])

    return (
        <div className="w-full">
            <Input type="hidden" name={name} value={currentImage} />
            {currentImage ? (
                <div className="relative group">
                    <img src={currentImage} alt="Featured" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[5px] flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant={`outline`}
                            className="cursor-pointer bg-white text-black hover:bg-gray-100 rounded-[5px]"
                            onClick={openFinder}
                        >
                            Đổi ảnh
                        </Button>
                        <Button
                            type="button"
                            variant={`destructive`}
                            className="cursor-pointer rounded-[5px]"
                            onClick={handleRemove}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div
                    className="w-full h-[200px] border-2 border-dashed border-gray-300 rounded-[5px] flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition"
                    onClick={openFinder}
                >
                    <svg className="w-16 h-16 fill-gray-400 mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
                        <path d="M80 57.6l-4-18.7v-23.9c0-1.1-.9-2-2-2h-3.5l-1.1-5.4c-.3-1.1-1.4-1.8-2.4-1.6l-32.6 7h-27.4c-1.1 0-2 .9-2 2v4.3l-3.4.7c-1.1.2-1.8 1.3-1.5 2.4l5 23.4v20.2c0 1.1.9 2 2 2h2.7l.9 4.4c.2.9 1 1.6 2 1.6h.4l27.9-6h33c1.1 0 2-.9 2-2v-5.5l2.4-.5c1.1-.2 1.8-1.3 1.6-2.4zm-75-21.5l-3-14.1 3-.6v14.7zm62.4-28.1l1.1 5h-24.5l23.4-5zm-54.8 64l-.8-4h19.6l-18.8 4zm37.7-6h-43.3v-51h67v51h-23.7zm25.7-7.5v-9.9l2 9.4-2 .5zm-52-21.5c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm-13-10v43h59v-43h-59zm57 2v24.1l-12.8-12.8c-3-3-7.9-3-11 0l-13.3 13.2-.1-.1c-1.1-1.1-2.5-1.7-4.1-1.7-1.5 0-3 .6-4.1 1.7l-9.6 9.8v-34.2h55zm-55 39v-2l11.1-11.2c1.4-1.4 3.9-1.4 5.3 0l9.7 9.7c-5.2 1.3-9 2.4-9.4 2.5l-3.7 1h-13zm55 0h-34.2c7.1-2 23.2-5.9 33-5.9l1.2-.1v6zm-1.3-7.9c-7.2 0-17.4 2-25.3 3.9l-9.1-9.1 13.3-13.3c2.2-2.2 5.9-2.2 8.1 0l14.3 14.3v4.1l-1.3.1z"></path>
                    </svg>
                    <span className="text-sm text-gray-500">Click để chọn ảnh đại diện</span>
                </div>
            )}
        </div>
    )

}
export default memo(CustomFeaturedImage)