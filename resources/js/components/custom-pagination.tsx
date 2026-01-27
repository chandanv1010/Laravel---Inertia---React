import { type ILink} from "@/types"
import { router } from "@inertiajs/react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useEffect, useState } from "react"

interface ICustomPaginateProps {
    links: ILink[],
    currentPage?: number,
    onProcessingChange?: (processing: boolean) => void
}
const CustomPagination = ({
    links,
    currentPage,
    onProcessingChange
}: ICustomPaginateProps) => {

    const [isProcessing, setIsProcessing] = useState<boolean>(false)

    useEffect(() => {

        const startListner = router.on('start', () => {
            setIsProcessing(true)
            onProcessingChange?.(true)
        })

        const finishListener = router.on('finish', () => {
            setIsProcessing(false)
            onProcessingChange?.(false)
        })

        return () => {
            startListner()
            finishListener()
        }

    }, [onProcessingChange])

    if(!links || links.length === 0) return null

    const prevLink = links.find(link => link.label === '&laquo; Previous')
    const nextLink = links.find(link => link.label === 'Next &raquo;')

    const paginationLinks = links.filter(link => link.label !== '&laquo; Previous' && link.label !== 'Next &raquo;')
    const numericLinks = paginationLinks
        .map((l) => ({ ...l, page: Number.parseInt(String(l.label), 10) }))
        .filter((l) => Number.isFinite(l.page) && l.page > 0)
        .sort((a, b) => a.page - b.page)

    const lastPage = numericLinks.length > 0 ? numericLinks[numericLinks.length - 1].page : (currentPage || 1)

    const buildDisplayPages = (current: number, last: number) => {
        const pages = new Set<number>()
        pages.add(1)
        pages.add(last)
        pages.add(current)
        pages.add(current - 1)
        pages.add(current + 1)
        // keep context near edges
        pages.add(2)
        pages.add(last - 1)
        return Array.from(pages.values())
            .filter((p) => p >= 1 && p <= last)
            .sort((a, b) => a - b)
    }

    const displayPages = buildDisplayPages(currentPage || 1, lastPage)

    const handlePageChange = (url: string) => {
        if(!url || isProcessing) return

        router.visit(url, {
            preserveScroll: true,
            preserveState: true
        })
    }

    
   

    return (
        <Pagination>
            <PaginationContent>
                {prevLink && 
                    <PaginationItem>
                        <PaginationPrevious 
                            // href={prevLink.url} 
                            onClick={() => handlePageChange(prevLink.url)}
                            aria-disabled={!prevLink.url || currentPage === 1 || isProcessing} 
                            className={!prevLink.url || currentPage === 1 ? "pointer-events-none opacity-50 cursor-pointer" : ""} 
                        />
                    </PaginationItem>
                }

                {(() => {
                    // Render condensed pagination with ellipsis
                    const items: Array<{ type: 'page' | 'ellipsis'; page?: number }> = []
                    for (let i = 0; i < displayPages.length; i++) {
                        const p = displayPages[i]
                        const prev = displayPages[i - 1]
                        if (i > 0 && prev !== undefined && p - prev > 1) {
                            items.push({ type: 'ellipsis' })
                        }
                        items.push({ type: 'page', page: p })
                    }

                    return items.map((it, idx) => {
                        if (it.type === 'ellipsis') {
                            return (
                                <PaginationItem key={`e-${idx}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            )
                        }

                        const link = numericLinks.find(l => l.page === it.page) || paginationLinks.find(l => String(l.label) === String(it.page))
                        const isActive = (currentPage || 1) === it.page
                        return (
                            <PaginationItem key={`p-${it.page}`}>
                                <PaginationLink
                                    className={link?.url ? "cursor-pointer" : "pointer-events-none opacity-50"}
                                    onClick={() => link?.url && handlePageChange(link.url)}
                                    isActive={isActive || !!link?.active}
                                >
                                    {it.page}
                                </PaginationLink>
                            </PaginationItem>
                        )
                    })
                })()}

                {nextLink && 
                    <PaginationItem>
                        <PaginationNext 
                            onClick={() => handlePageChange(nextLink.url)} 
                            aria-disabled={!nextLink.url || (currentPage || 1) === lastPage || isProcessing} 
                            className={!nextLink.url || (currentPage || 1) === lastPage ? "pointer-events-none opacity-50 cursor-pointer" : ""} 
                        />
                    </PaginationItem>
                }
            </PaginationContent>
        </Pagination>
    )
}

export default CustomPagination