import { useState } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import CustomPageHeading from '@/components/custom-page-heading'
import { type BreadcrumbItem } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus } from 'lucide-react'
import ReasonList from './components/reason-list'
import ReasonFormModal from './components/reason-form-modal'
import CustomConfirmDialog from '@/components/custom-confirm-dialog'

interface CashReason {
    id: number
    name: string
    type: 'receipt' | 'payment'
    description?: string
    is_default: boolean
    publish: string
    order: number
}

interface ReasonIndexProps {
    reasons: {
        data: CashReason[]
        current_page: number
        last_page: number
        per_page: number
        total: number
    }
    filters?: {
        keyword?: string
        type?: string
        publish?: string
    }
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sổ quỹ', href: '/backend/cash-book/transaction' },
    { title: 'Lý do thu chi', href: '/backend/cash-book/reason' },
]

export default function ReasonIndex({ reasons, filters = {} }: ReasonIndexProps) {
    const [activeTab, setActiveTab] = useState<'receipt' | 'payment'>('receipt')
    const [showModal, setShowModal] = useState(false)
    const [editingReason, setEditingReason] = useState<CashReason | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const receiptReasons = reasons.data.filter(r => r.type === 'receipt')
    const paymentReasons = reasons.data.filter(r => r.type === 'payment')

    const handleCreate = () => {
        setEditingReason(null)
        setShowModal(true)
    }

    const handleEdit = (reason: CashReason) => {
        setEditingReason(reason)
        setShowModal(true)
    }

    const handleDelete = (id: number) => {
        setDeletingId(id)
        setShowDeleteDialog(true)
    }

    const confirmDelete = () => {
        if (deletingId) {
            setIsDeleting(true)
            router.delete(`/backend/cash-book/reason/${deletingId}`, {
                preserveScroll: true,
                onFinish: () => {
                    setIsDeleting(false)
                    setShowDeleteDialog(false)
                    setDeletingId(null)
                }
            })
        }
    }

    const handleModalClose = () => {
        setShowModal(false)
        setEditingReason(null)
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Quản lý lý do thu chi" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading="Lý do thu chi"
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <p className="text-sm text-muted-foreground">
                                    Quản lý các lý do thu và chi tiền
                                </p>
                                <Button
                                    onClick={handleCreate}
                                    className="bg-blue-500 hover:bg-blue-600"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Thêm lý do
                                </Button>
                            </div>

                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receipt' | 'payment')}>
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="receipt">Lý do thu</TabsTrigger>
                                    <TabsTrigger value="payment">Lý do chi</TabsTrigger>
                                </TabsList>

                                <TabsContent value="receipt" className="mt-6">
                                    <ReasonList
                                        reasons={receiptReasons}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                </TabsContent>

                                <TabsContent value="payment" className="mt-6">
                                    <ReasonList
                                        reasons={paymentReasons}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                </TabsContent>
                            </Tabs>
                        </div>
                    </div>
                </div>
            </div>

            <ReasonFormModal
                open={showModal}
                onClose={handleModalClose}
                reason={editingReason}
                defaultType={activeTab}
            />

            <CustomConfirmDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                title="Xác nhận xóa"
                description="Bạn có chắc chắn muốn xóa lý do này? Hành động này không thể hoàn tác."
                onConfirm={confirmDelete}
                processing={isDeleting}
            />
        </AppLayout>
    )
}
