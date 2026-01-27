import { IFilter, ISelectOptionItem } from "@/types";


export const publish: ISelectOptionItem[] = [
    {
        label: 'Không hoạt động',
        value: '1'
    },
    {
        label: 'Hoạt động',
        value: '2'
    }
]

export const postType: ISelectOptionItem[] = [
    { value: 'blog', label: 'Blog' },
    { value: 'video', label: 'Video' },
    { value: 'faq', label: 'Faq' },
    { value: 'tutorial', label: 'Hướng dẫn' },
]

export const robots: ISelectOptionItem[] = [
    { value: 'index', label: 'Index' },
    { value: 'noindex', label: 'NoIndex' },
]

// export const chooseAll(): ISelectOptionItem => { label: 'Chọn tất cả', value: '0' }

export const chooseAll = (label: string  = 'Chọn tất cả'): ISelectOptionItem => {
    return { label: label, value: '0' }
}

export const filter: IFilter[] = [
    {
        key: 'perpage',
        placeholder: 'Chọn số bản ghi',
        defaulValue: '20',
        options: ['20', '30', '40', '50', '60', '80', '100'].map(item => ({
            label: `${item} bản ghi`,
            value: item
        })),
        className:'w-[180px]',
        type: 'single'
    },
    {
        key: 'publish',
        placeholder: 'Chọn trạng thái',
        defaulValue: '0',
        options: [
            { ...chooseAll('Tất cả trạng thái') },
            ...publish
        ],
        type: 'single'
    }
]