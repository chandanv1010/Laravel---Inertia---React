import { Label } from '@/components/ui/label'
import InputError from '@/components/input-error'
import CustomCard from '@/components/custom-card'

interface StatusSelectorProps {
    value?: string
    error?: string
}

export function StatusSelector({
    value = '2',
    error
}: StatusSelectorProps) {
    return (
        <CustomCard isShowHeader={true} title="Trạng thái">
            <div className="space-y-2">
                <Label>Trạng thái</Label>
                <select
                    name="publish"
                    defaultValue={value}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                    <option value="1">Đang hoạt động</option>
                    <option value="2">Tạm dừng</option>
                </select>
                <InputError message={error} className="mt-1" />
            </div>
        </CustomCard>
    )
}

