import {
  AlertDialog,
//   AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
//   AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "./ui/button"
import { LoaderCircle } from "lucide-react"


interface ICustomConfirmDialogProps {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    title?: string,
    description?: string,
    onConfirm: () => void,
    confirmText?: string,
    confirmButtonClassName?: string,
    processing?: boolean
}
const CustomConfirmDialog = ({
    open,
    onOpenChange,
    title = 'Xác nhận hành động',
    description = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
    onConfirm,
    confirmText = 'Xác nhận và xóa',
    confirmButtonClassName = 'w-[150px] cursor-pointer bg-red-400 text-white hover:bg-red-500',
    processing = false
}: ICustomConfirmDialogProps) => {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
               <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
                    <Button
                        type="submit"
                        className={confirmButtonClassName}
                        tabIndex={4}
                        onClick={() => {
                            onConfirm()
                        }}
                        disabled={processing}
                    >
                        {processing && (
                            <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                        )}
                        {confirmText}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default CustomConfirmDialog