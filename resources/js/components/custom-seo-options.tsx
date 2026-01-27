import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { publish as publishArray, postType as postTypeArray, robots as robotsArray } from "@/constants/filter";
import { useFormContext } from "@/contexts/FormContext";
import { useEffect, memo } from "react";
import ImageObjectFitSelector from "./image-object-fit-selector";

interface ICustomSeoOptionsProps {
    order?: string,
    publish?: string,
    robots?: string,
    postType?: string,
    hidden?: string[],
    initialGalleryStyle?: string,
    initialImageAspectRatio?: string,
    initialImageObjectFit?: string
}
function CustomSeoOptions({
    order = '0',
    publish = '2',
    robots = 'index',
    postType = 'blog',
    hidden = [],
    initialGalleryStyle,
    initialImageAspectRatio,
    initialImageObjectFit
}: ICustomSeoOptionsProps) {

    const {
        selectedPublish,
        selectedRobots,
        setSelectedPublish,
        setSelectedRobots,
        imageAspectRatio,
        setImageAspectRatio,
        galleryStyle,
        setGalleryStyle,
        imageObjectFit,
        setImageObjectFit
    } = useFormContext()

    useEffect(() => {
        if (publish) setSelectedPublish(publish)
        if (robots) setSelectedRobots(robots)
        // Initialize gallery settings from record
        if (initialGalleryStyle) setGalleryStyle(initialGalleryStyle)
        if (initialImageAspectRatio) setImageAspectRatio(initialImageAspectRatio)
        if (initialImageObjectFit) setImageObjectFit(initialImageObjectFit)
    }, [robots, publish, initialGalleryStyle, initialImageAspectRatio, initialImageObjectFit, setSelectedRobots, setSelectedPublish, setGalleryStyle, setImageAspectRatio, setImageObjectFit])

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="order" className="mb-2 block">Vị trí</Label>
                <Input
                    name="order"
                    id="order"
                    type="number"
                    min="0"
                    defaultValue={order}
                    placeholder="0"
                    className="w-full"
                />
            </div>
            <div>
                <Label htmlFor="publish" className="mb-2 block">Trạng Thái</Label>
                <Select
                    name="publish"
                    value={selectedPublish}
                    onValueChange={setSelectedPublish}
                >
                    <SelectTrigger className="w-full cursor-pointer" id="publish">
                        <SelectValue placeholder="Chọn Trạng Thái" />
                    </SelectTrigger>
                    <SelectContent>
                        {publishArray.map(item => (
                            <SelectItem
                                className="cursor-pointer"
                                key={item.value}
                                value={item.value}
                            >{item.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {!hidden.includes('type') && (
                <div>
                    <Label htmlFor="type" className="mb-2 block">Loại Tin</Label>
                    <Select
                        name="type"
                        defaultValue={postType}
                    >
                        <SelectTrigger className="w-full cursor-pointer" id="type">
                            <SelectValue placeholder="Loại Tin" />
                        </SelectTrigger>
                        <SelectContent>
                            {postTypeArray.map(item => (
                                <SelectItem
                                    className="cursor-pointer"
                                    key={item.value}
                                    value={item.value}
                                >{item.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div>
                <Label htmlFor="robots" className="mb-2 block">Robots</Label>
                <Select
                    name="robots"
                    value={selectedRobots}
                    onValueChange={setSelectedRobots}
                >
                    <SelectTrigger className="w-full cursor-pointer" id="robots">
                        <SelectValue placeholder="Robots" />
                    </SelectTrigger>
                    <SelectContent>
                        {robotsArray.map(item => (
                            <SelectItem
                                className="cursor-pointer"
                                key={item.value}
                                value={item.value}
                            >{item.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="image_aspect_ratio" className="mb-2 block">Tỉ lệ ảnh</Label>
                    <Select
                        name="image_aspect_ratio"
                        value={imageAspectRatio}
                        onValueChange={setImageAspectRatio}
                    >
                        <SelectTrigger className="w-full cursor-pointer" id="image_aspect_ratio">
                            <SelectValue placeholder="Chọn tỉ lệ" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem className="cursor-pointer" value="16:9">16:9</SelectItem>
                            <SelectItem className="cursor-pointer" value="4:3">4:3</SelectItem>
                            <SelectItem className="cursor-pointer" value="1:1">1:1</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="gallery_style" className="mb-2 block">Kiểu Slide</Label>
                    <Select
                        name="gallery_style"
                        value={galleryStyle}
                        onValueChange={setGalleryStyle}
                    >
                        <SelectTrigger className="w-full cursor-pointer" id="gallery_style">
                            <SelectValue placeholder="Chọn kiểu" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem className="cursor-pointer" value="vertical">Vertical</SelectItem>
                            <SelectItem className="cursor-pointer" value="horizontal">Horizontal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <ImageObjectFitSelector
                value={imageObjectFit as 'cover' | 'scale-down' | 'auto' | 'contain'}
                onChange={setImageObjectFit}
                label="Kiểu hiển thị ảnh"
            />
        </div>
    )
}

export default memo(CustomSeoOptions)