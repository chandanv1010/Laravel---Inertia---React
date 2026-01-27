
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { router } from "@inertiajs/react"
import { Loader2 } from "lucide-react"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface RedirectModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: {
        id: number
        canonical: string
        redirect?: string | null
        redirect_type?: number | null
    } | null
}

export function RedirectModal({ open, onOpenChange, item }: RedirectModalProps) {
    const [redirectUrl, setRedirectUrl] = useState("")
    const [redirectType, setRedirectType] = useState("301")
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && item) {
            setRedirectUrl(item.redirect || "")
            setRedirectType(item.redirect_type?.toString() || "301")
        }
    }, [open, item])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!item) return

        setLoading(true)
        router.put(
            `/backend/router/${item.id}`,
            {
                redirect: redirectUrl,
                redirect_type: parseInt(redirectType)
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                    setLoading(false)
                },
                onError: () => {
                    setLoading(false)
                }
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Cấu hình chuyển hướng</DialogTitle>
                        <DialogDescription>
                            Nhập đường dẫn đích muốn chuyển hướng cho router <strong>{item?.canonical}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="redirect" className="text-right">
                                Redirect To
                            </Label>
                            <Input
                                id="redirect"
                                value={redirectUrl}
                                onChange={(e) => setRedirectUrl(e.target.value)}
                                placeholder="Nhập URL đích..."
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">
                                Loại
                            </Label>
                            <div className="col-span-3">
                                <Select value={redirectType} onValueChange={setRedirectType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại redirect" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="301">301 (Moved Permanently)</SelectItem>
                                        <SelectItem value="302">302 (Found / Temporary)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
