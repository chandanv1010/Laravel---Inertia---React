import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { loadCkfinder } from "@/lib/ckfinder-loader"

type CKFinderFinder = {
    resourceType?: string
    selectActionFunction?: (fileUrl: string) => void
    popup: () => void
}

type CKFinderConstructor = {
    new (): CKFinderFinder
}

type WindowWithCKFinder = Window & {
    CKFinder?: CKFinderConstructor
}

interface ICkfinderInputProps {
    name: string,
    value?: string
}
export default function CkfinderInput({
    name,
    value
}: ICkfinderInputProps) {

    const [image, setImage] = useState<string>('')


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
            finder.selectActionFunction = function( fileUrl: string) {
                setImage(fileUrl)
            }
                    // @ts-ignore - CKFinder is a third-party library, allow any type
            finder.popup();
                }
            }
        } catch (error) {
            console.error('CKFinder error:', error)
        }
    }

    useEffect(() => {
        if(value) setImage(value)
    }, [value])

    useEffect(() => {
       loadCkfinder()
    }, [])


    return (
        <div>
            <div className="w-full">
                <div className="flex gap-2">
                    <Input 
                        name={name}
                        type="text" placeholder="" 
                        className="w-[80%]"
                        value={image}
                        id={name}
                        readOnly
                    />
                    <Button type="button" variant="outline" className="w-[20%] cursor-pointer bg-black text-white" onClick={openFinder}>
                        Chọn Ảnh
                    </Button>
                </div>
            </div>
        </div>
    )
}