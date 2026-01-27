import { User } from "@/types"
import { chooseAll } from "@/constants/filter"
import { useMemo } from "react"
import { type IFilter } from "@/types";

interface IUseFilter {
    users?: User[],
    defaultFilters: IFilter[] | undefined,
    isShowCreatorFilter?: boolean,
    catalogues?: Array<{ value: string, label: string }>,
    catalogueFieldName?: string // Tên field cho catalogue filter (mặc định: 'post_catalogue_id')
}
export const useFilter = ({
    users = [],
    defaultFilters = [],
    isShowCreatorFilter = true,
    catalogues,
    catalogueFieldName = 'post_catalogue_id' // Default cho posts, products sẽ truyền 'product_catalogue_id'
}: IUseFilter) => {

    const filters: IFilter[] | undefined = useMemo(() => {

        const baseFilters = [...defaultFilters]
        // Chỉ thêm creator filter nếu isShowCreatorFilter = true VÀ có users
        if (isShowCreatorFilter && users && users.length > 0) {
            baseFilters.push({
                key: 'user_id',
                placeholder: 'Chọn người tạo',
                options: [
                    { ...chooseAll('Tất cả người tạo') },
                    ...users.map(user => ({
                        label: user.name,
                        value: user.id.toString()
                    }))
                ],
                defaulValue: '0',
                type: 'single'
            })
        }

        // Thêm filter cho catalogue_id nếu có catalogues
        if (catalogues && catalogues.length > 0) {
            baseFilters.push({
                key: catalogueFieldName,
                placeholder: 'Chọn danh mục',
                options: catalogues.map(cat => ({
                    label: cat.label,
                    value: cat.value
                })),
                defaulValue: [],
                type: 'multiple',
                operator: 'in',
                field: 'id',
                maxCount: 0 // Không hiển thị badge trong MultiSelect, sẽ hiển thị ở CustomActiveFilters bên dưới
            })
        }

        return baseFilters
    }, [users, defaultFilters, isShowCreatorFilter, catalogues])

    return {
        filters
    }
}