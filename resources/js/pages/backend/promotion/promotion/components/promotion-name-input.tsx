import { Input } from '@/components/ui/input'
import InputError from '@/components/input-error'
import CustomCard from '@/components/custom-card'

interface PromotionNameInputProps {
    name: string
    defaultValue?: string
    placeholder?: string
    error?: string
    onChange?: (value: string) => void
}

export function PromotionNameInput({
    name,
    defaultValue,
    placeholder = 'VD: Chương trình khuyến mại',
    error,
    onChange
}: PromotionNameInputProps) {
    return (
        <CustomCard isShowHeader={false}>
            <div className="space-y-2">
                <Input
                    id={name}
                    name={name}
                    defaultValue={defaultValue}
                    placeholder={placeholder}
                    required
                    onChange={(e) => onChange?.(e.target.value)}
                />
                <InputError message={error} className="mt-1" />
            </div>
        </CustomCard>
    )
}

