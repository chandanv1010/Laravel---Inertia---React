import { Badge } from '@/components/ui/badge'

interface ICustomRobotsBadgeProps {
    robots: string | undefined
    loading?: boolean
    onClick?: (e: React.MouseEvent) => void
}

const CustomRobotsBadge = ({ robots, loading = false, onClick }: ICustomRobotsBadgeProps) => {
    const isNoIndex = robots === 'noindex'

    return (
        <Badge
            variant="outline"
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-[5px] cursor-pointer transition-opacity ${
                loading ? 'opacity-50' : 'hover:opacity-80'
            }`}
            style={
                isNoIndex
                    ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#dc2626',
                          borderColor: 'rgba(239, 68, 68, 0.3)'
                      }
                    : {
                          backgroundColor: 'rgba(34, 197, 94, 0.1)',
                          color: '#16a34a',
                          borderColor: 'rgba(34, 197, 94, 0.3)'
                      }
            }
            onClick={onClick}
        >
            {isNoIndex ? (
                <>
                    <span className="w-3 h-3 rounded-full bg-red-600 flex items-center justify-center">
                        <span className="text-white text-[8px] leading-none">/</span>
                    </span>
                    NoIndex
                </>
            ) : (
                'Index'
            )}
        </Badge>
    )
}

export default CustomRobotsBadge

