import {
  AlertDialog,
//   AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Form } from "@inertiajs/react"
import { Button } from "./ui/button"
import { LoaderCircle } from "lucide-react"
import { useMemo } from "react"

interface ICustomConfirmDeleteProps {
    id: number,
    module: string | undefined,
    children: React.ReactNode
}


const CustomConfirmDelete = ({
    id,
    module,
    children
}: ICustomConfirmDeleteProps) => {

    const actionForm = useMemo(() => `/backend/${module}/${id}`, [id, module])

    return (
        
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <Form
                    method="post"
                    action={actionForm}
                    transform={(data) => ({ 
                        ...data,
                        ...({_method: 'delete'}), 
                    })}
                >
                    {({ processing }) => (
                        <>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Bạn có chắc chắn muốn xóa bản ghi này?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Lưu ý: Hành động này là không thể đảo ngược, hãy chắc chắn bạn muốn thực hiện hành động này
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel className="cursor-pointer">Hủy</AlertDialogCancel>
                                <Button
                                    type="submit"
                                    className="w-[150px] cursor-pointer bg-red-400 text-white hover:bg-red-500"
                                    tabIndex={4}
                                    disabled={processing}
                                >
                                    {processing && (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                    )}
                                    Xác nhận và xóa
                                </Button>
                            </AlertDialogFooter>
                        </>
                        
                        )}
                    </Form>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default CustomConfirmDelete