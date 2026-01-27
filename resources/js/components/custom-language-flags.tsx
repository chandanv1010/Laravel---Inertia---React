import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CheckCircle2 } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'

interface Language {
    id: number
    name: string
    canonical: string
    image: string
}

interface ICustomLanguageFlagsProps {
    languages: Language[]
    translatedLanguageIds: number[]
    postId: number
    module?: string
    className?: string
    variant?: 'table' | 'page' // 'table' = chiều cao cố định, 'page' = height auto
}

const CustomLanguageFlags = ({ languages, translatedLanguageIds, postId, module = 'post', className = '', variant = 'table' }: ICustomLanguageFlagsProps) => {
    const pageProps = usePage().props as { app?: { language_id?: number } }
    const currentLanguageId = pageProps.app?.language_id

    if (!languages || languages.length === 0) {
        return null
    }

    const handleLanguageClick = (languageId: number) => {
        if (languageId === currentLanguageId) {
            // Nếu là ngôn ngữ hiện tại, vào trang edit
            router.visit(`/backend/${module}/${postId}/edit`)
        } else {
            // Nếu là ngôn ngữ khác, vào trang translate
            router.visit(`/backend/${module}/${postId}/translate/${languageId}`)
        }
    }

    // Filter out current language khi variant='table' vì không cần thiết
    const displayLanguages = variant === 'table'
        ? languages.filter(lang => lang.id !== currentLanguageId)
        : languages

    return (
        <div className={`flex ${variant === 'table' ? 'flex-nowrap' : 'flex-wrap'} gap-1 justify-center items-center ${className}`}>
            <TooltipProvider>
                {displayLanguages.map((language) => {
                    const isTranslated = translatedLanguageIds.includes(language.id)
                    const isCurrentLanguage = language.id === currentLanguageId

                    return (
                        <Tooltip key={language.id}>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => handleLanguageClick(language.id)}
                                    className={`
                                        relative inline-flex items-center justify-center
                                        ${variant === 'table' ? 'w-6 h-5' : 'w-8 h-6'}
                                        rounded-sm overflow-hidden
                                        border transition-all duration-200 cursor-pointer
                                        hover:scale-110 hover:shadow-md flex-shrink-0
                                        ${isCurrentLanguage
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-300'
                                            : isTranslated
                                                ? 'border-green-300 bg-green-50 dark:bg-green-950/30 hover:border-green-400'
                                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 hover:opacity-100'
                                        }
                                    `}
                                >
                                    <img
                                        src={language.image}
                                        alt={language.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            const parent = target.parentElement;
                                            if (parent) {
                                                parent.classList.add('bg-gray-200', 'dark:bg-gray-700');
                                                parent.innerHTML = `<span class="text-[8px] font-medium text-gray-600 dark:text-gray-300">${language.canonical.toUpperCase().substring(0, 2)}</span>`;
                                            }
                                        }}
                                    />
                                    {isTranslated && !isCurrentLanguage && (
                                        <div className="absolute -bottom-0.5 -right-0.5">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-green-600 dark:text-green-400 bg-white dark:bg-gray-900 rounded-full" />
                                        </div>
                                    )}
                                    {isCurrentLanguage && (
                                        <div className="absolute -top-0.5 -right-0.5">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full border border-white dark:border-gray-900"></div>
                                        </div>
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <div className="text-xs">
                                    <div className="font-semibold">{language.name}</div>
                                    <div className="mt-0.5 text-gray-500">
                                        {isCurrentLanguage
                                            ? '● Ngôn ngữ hiện tại'
                                            : isTranslated
                                                ? '✓ Đã dịch - Click để sửa'
                                                : '○ Chưa dịch - Click để dịch'
                                        }
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </TooltipProvider>
        </div>
    )
}

export default CustomLanguageFlags

