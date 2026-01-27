import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
    className?: string
}

export function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
    className
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
            <CollapsibleTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex w-full justify-between p-4 hover:bg-accent"
                >
                    <span className="text-base font-semibold">{title}</span>
                    <ChevronDown
                        className={cn(
                            "h-5 w-5 transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0">
                {children}
            </CollapsibleContent>
        </Collapsible>
    )
}
