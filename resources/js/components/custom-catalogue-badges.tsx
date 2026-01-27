import { router } from '@inertiajs/react'
import { Badge } from '@/components/ui/badge'

interface ICustomCatalogueBadgesProps {
    catalogues: Array<{ id: number; name: string }>
    catalogueFieldName?: string // Tên field cho catalogue filter (mặc định: 'post_catalogue_id')
}

const CustomCatalogueBadges = ({ catalogues, catalogueFieldName = 'post_catalogue_id' }: ICustomCatalogueBadgesProps) => {
    if (!catalogues || catalogues.length === 0) {
        return null
    }

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {catalogues.map((catalogue) => (
                <Badge 
                    key={catalogue.id} 
                    variant="outline" 
                    className="text-xs rounded-[5px] cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#16a34a',
                        borderColor: 'rgba(34, 197, 94, 0.3)'
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        router.get(window.location.pathname, {
                            [`${catalogueFieldName}[id][in]`]: catalogue.id.toString()
                        }, {
                            preserveScroll: true,
                            preserveState: false,
                        })
                    }}
                >
                    {catalogue.name}
                </Badge>
            ))}
        </div>
    )
}

export default CustomCatalogueBadges

