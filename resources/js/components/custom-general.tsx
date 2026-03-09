import CustomCard from "./custom-card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import InputError from "./input-error"
import EditorPage from '@/components/editor';
import { useFormContext } from "@/contexts/FormContext";
import { memo, useCallback, } from "react";
import React from "react";



interface ICustomGeneralProps {
    name?: string,
    errors?: Record<string, string>,
    description?: string,
    content?: string,
    isShowContent?: boolean,
    isShowDescription?: boolean,
    className?: string
}

const CustomGeneral = ({
    name,
    description,
    content,
    errors,
    isShowContent = true,
    isShowDescription = true,
    className
}: ICustomGeneralProps) => {
    const { setName, setContent, setDescription } = useFormContext()

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value)
    }, [setName])

    const handleDescriptionChange = useCallback((data: string) => {
        setDescription(data)
    }, [setDescription])

    const handleContentChange = useCallback((data: string) => {
        setContent(data)
    }, [setContent])


    // useEffect(() => {
    //     console.log(name, description, content);

    // }, [name, description, content])

    return (
        <CustomCard
            isShowHeader={true}
            title="Thông tin chung"
            className={className}
        >
            <div className="grid grid-cols-1 gap-4 mb-[20px]">
                <div className="col-span-1">
                    <Label htmlFor="name" className="mb-[10px]">Tiêu đề</Label>
                    <Input
                        id="name"
                        type="text"
                        name="name"
                        autoFocus
                        tabIndex={1}
                        autoComplete="off"
                        placeholder=""
                        defaultValue={name}
                        onChange={handleNameChange}
                    />
                    <InputError message={errors?.name} className="mt-[5px]" />
                </div>
            </div>

            {isShowDescription && (
                <div className="grid grid-cols-1 gap-4 mb-[20px]">
                    <div className="col-span-1">
                        <Label className="mb-[10px]">Mô Tả</Label>
                        <EditorPage
                            name="description"
                            value={description}
                            onChange={handleDescriptionChange}
                        />
                    </div>
                </div>
            )}

            {isShowContent && (
                <div className="grid grid-cols-1 gap-4">
                    <div className="col-span-1">
                        <Label className="mb-[10px]">Nội dung</Label>
                        <EditorPage
                            name="content"
                            height={600}
                            value={content}
                            onChange={handleContentChange}
                        />
                    </div>
                </div>
            )}

        </CustomCard>
    )
}

export default memo(CustomGeneral)