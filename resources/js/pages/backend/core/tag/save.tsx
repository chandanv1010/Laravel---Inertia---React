import { useRef, useEffect } from 'react'
import { Head, Link, useForm, router } from '@inertiajs/react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import CustomCard from "@/components/custom-card"
import { Save, ArrowLeft } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Tag {
    id: number
    name: string
    slug: string
    type: string
    description?: string
}

interface SaveProps {
    record?: Tag
}

export default function SavePage({ record }: SaveProps) {
    const { toast } = useToast()
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: record?.name || '',
        slug: record?.slug || '',
        type: record?.type || 'general',
        description: record?.description || '',
    })

    const isEdit = !!record

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const action = isEdit ? put : post
        const url = isEdit ? tags.update(record.id).url : tags.store().url

        action(url, {
            onSuccess: () => {
                toast({
                    title: "Thành công",
                    description: isEdit ? "Cập nhật tag thành công" : "Tạo tag thành công",
                })
            },
            onError: () => {
                toast({
                    variant: "destructive",
                    title: "Lỗi",
                    description: "Có lỗi xảy ra, vui lòng kiểm tra lại",
                })
            }
        })
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8 pt-6">
            <Head title={isEdit ? "Cập nhật Tag" : "Thêm mới Tag"} />

            <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink href={dashboard().url}>Dashboard</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink href={tags.index().url}>Tags</BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{isEdit ? "Cập nhật" : "Thêm mới"}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <h2 className="text-3xl font-bold tracking-tight mt-2">{isEdit ? `Cập nhật: ${record.name}` : "Thêm mới Tag"}</h2>
                    </div>

                    <div className="flex gap-2">
                        <Link href={tags.index().url}>
                            <Button variant="outline" type="button">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Quay lại
                            </Button>
                        </Link>
                        <Button type="submit" disabled={processing}>
                            <Save className="mr-2 h-4 w-4" />
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <CustomCard title="Thông tin cơ bản">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Tên Tag</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Nhập tên tag"
                                />
                                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug (Tùy chọn)</Label>
                                <Input
                                    id="slug"
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value)}
                                    placeholder="Slug sẽ tự động tạo nếu bỏ trống"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Loại Tag</Label>
                                <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại tag" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="general">Mặc định (General)</SelectItem>
                                        <SelectItem value="product">Sản phẩm</SelectItem>
                                        <SelectItem value="post">Bài viết</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Mô tả</Label>
                                <Textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    placeholder="Mô tả về tag"
                                    rows={4}
                                />
                            </div>
                        </div>
                    </CustomCard>
                </div>
            </form>
        </div>
    )
}
