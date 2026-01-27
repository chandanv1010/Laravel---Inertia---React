import { useRef, useMemo } from 'react'
import { Head, Link, useForm, router } from '@inertiajs/react'
import tags from '@/routes/tags'
import { dashboard } from '@/routes'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import CustomTable from '@/components/custom-table'
import { ColumnDef } from '@tanstack/react-table'
import { Edit, Trash2, Plus } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { useState } from 'react'

interface Tag {
    id: number
    name: string
    slug: string
    type: string
    description?: string
    created_at: string
}

interface IndexProps {
    tags: {
        data: Tag[]
        total: number
        per_page: number
        current_page: number
        last_page: number
    }
}

export default function Index({ tags: initialTags }: IndexProps) {
    const { toast } = useToast()
    const [deleteId, setDeleteId] = useState<number | null>(null)

    const columns = useMemo<ColumnDef<Tag>[]>(() => [
        {
            accessorKey: "name",
            header: "Tên Tag",
        },
        {
            accessorKey: "slug",
            header: "Slug",
        },
        {
            accessorKey: "type",
            header: "Loại",
        },
        {
            accessorKey: "description",
            header: "Mô tả",
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const tag = row.original
                return (
                    <div className="flex items-center gap-2">
                        <Link href={tags.edit(tag.id).url}>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(tag.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }
        }
    ], [])

    const handleDelete = () => {
        if (deleteId) {
            router.delete(tags.destroy(deleteId).url, {
                onSuccess: () => {
                    setDeleteId(null)
                    toast({
                        title: "Thành công",
                        description: "Xóa tag thành công",
                    })
                },
                onError: () => {
                    toast({
                        variant: "destructive",
                        title: "Lỗi",
                        description: "Không thể xóa tag này",
                    })
                }
            })
        }
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-8 pt-6">
            <Head title="Quản lý Tags" />

            <div className="flex items-center justify-between">
                <div>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href={dashboard().url}>Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Quản lý Tags</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <h2 className="text-3xl font-bold tracking-tight mt-2">Danh sách Tags</h2>
                </div>

                <Link href={tags.create().url}>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm mới
                    </Button>
                </Link>
            </div>

            <CustomTable
                columns={columns}
                data={tags}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Tag sẽ bị xóa vĩnh viễn khỏi hệ thống.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
