import { Star } from 'lucide-react'

interface ClientReviewsProps {
    averageRating?: number
    reviewsCount?: number
    size?: 'sm' | 'md' | 'lg'
    showCount?: boolean
    className?: string
}

/**
 * Unified Reviews Display Component
 * Displays star rating and optional review count
 * Ensures consistent review display across the entire site
 */
export function ClientReviews({
    averageRating = 5.0,
    reviewsCount = 0,
    size = 'md',
    showCount = true,
    className = ''
}: ClientReviewsProps) {
    // Size configurations
    const sizeConfig = {
        sm: { star: 'h-3 w-3', text: 'text-xs', gap: 'gap-0.5' },
        md: { star: 'h-4 w-4', text: 'text-sm', gap: 'gap-1' },
        lg: { star: 'h-5 w-5', text: 'text-base', gap: 'gap-1.5' }
    }

    const config = sizeConfig[size]

    // Calculate full and half stars
    const fullStars = Math.floor(averageRating)
    const hasHalfStar = averageRating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
        <div className={`flex items-center ${config.gap} ${className}`}>
            {/* Stars */}
            <div className={`flex items-center ${config.gap}`}>
                {/* Full stars */}
                {Array.from({ length: fullStars }).map((_, i) => (
                    <Star
                        key={`full-${i}`}
                        className={`${config.star} fill-yellow-400 text-yellow-400`}
                    />
                ))}

                {/* Half star */}
                {hasHalfStar && (
                    <div className="relative">
                        <Star className={`${config.star} text-gray-300`} />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                            <Star className={`${config.star} fill-yellow-400 text-yellow-400`} />
                        </div>
                    </div>
                )}

                {/* Empty stars */}
                {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star
                        key={`empty-${i}`}
                        className={`${config.star} text-gray-300`}
                    />
                ))}
            </div>

            {/* Rating value and count */}
            {showCount && (
                <span className={`${config.text} text-gray-600`}>
                    {averageRating.toFixed(1)} ({reviewsCount})
                </span>
            )}
        </div>
    )
}
