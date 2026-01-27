import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { router } from "@inertiajs/react"
import CustomConfirmDialog from "./custom-confirm-dialog"
import { useState } from "react"


export type TBulkAction = {
    label: string,
    confirm?: boolean,
    confirmTitle?: string,
    confirmDescription?: string,
    run: (ids: number[], module: string, resource: string) => Promise<void> | void
}


const getDefaultActions = (): TBulkAction[] => [
    {
        label: 'Xóa nhiều bản ghi',
        confirmTitle: 'Bạn có chắc chắn muốn xóa các bản ghi này',
        confirmDescription: 'Lưu ý: Hành động này không thể đảo ngược hãy chắc chắn bạn muốn thực hiện?',
        confirm: true,
        run: async (ids: number[], module: string, resource: string) => {
            if (ids.length) {
                router.delete(`/backend/${module}`, {
                    data: { ids },
                    only: [resource, 'flash'],
                    preserveScroll: true,
                    preserveState: true,
                })
            }
        }
    },
    {
        label: 'Cập nhật trạng thái: Bật',
        run: (ids: number[], module: string, resource: string) => {
            if (ids.length) {
                router.patch(`/backend/${module}`, {
                    ids: ids,
                    publish: '2'
                }, {
                    only: [resource, 'flash'],
                    preserveScroll: true,
                    preserveState: false
                })
            }
        }
    },
    {
        label: 'Cập nhật trạng thái: Tắt',
        run: (ids: number[], module: string, resource: string) => {
            if (ids.length) {
                router.patch(`/backend/${module}`, {
                    ids: ids,
                    publish: '1'
                }, {
                    only: [resource, 'flash'],
                    preserveScroll: true,
                    preserveState: false
                })
            }
        }
    },
]

interface ICustomBulkActionProps {
    className?: string,
    selectedIds: number[],
    actions?: TBulkAction[],
    module: string,
    resource?: string,
    setSelectedIds: (ids: number[]) => void
}
const CustomBulkAction = ({
    className,
    selectedIds,
    actions,
    module,
    resource = 'records',
    setSelectedIds
}: ICustomBulkActionProps) => {

    const [openDialog, setOpenDialog] = useState<boolean>(false)
    const [pendingAction, setPendingAction] = useState<TBulkAction | null>(null)
    const [processing, setProcessing] = useState<boolean>(false)


    const mergedActions = [...getDefaultActions(), ...(actions ?? [])]


    const handleAction = (index: string) => {
        const action = mergedActions[Number(index)]
        if (!action) return

        if (action.confirm) {
            setPendingAction(action)
            setOpenDialog(true)
        } else {
            action.run(selectedIds, module, resource)
            setSelectedIds([])
        }

    }

    const handleConfirm = async () => {
        if (!pendingAction) return
        try {
            setProcessing(true)
            await pendingAction.run(selectedIds, module, resource)
            setOpenDialog(false)
            setSelectedIds([])
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className={`${className ? className : ''}`}>
            <Select
                onValueChange={handleAction}
            >
                <SelectTrigger className={`w-[220px] mr-[10px] cursor-pointer rounded-[5px]`}>
                    <SelectValue placeholder="Chọn tác vụ" />
                </SelectTrigger>
                <SelectContent>
                    {mergedActions.map((option, index) => <SelectItem key={index} value={String(index)}>{option.label}</SelectItem>)}
                </SelectContent>
            </Select>

            {pendingAction && (
                <CustomConfirmDialog
                    open={openDialog}
                    onOpenChange={setOpenDialog}
                    title={pendingAction.confirmTitle}
                    description={pendingAction.confirmDescription}
                    onConfirm={handleConfirm}
                    processing={processing}
                />
            )}

        </div>
    )
}

export default CustomBulkAction