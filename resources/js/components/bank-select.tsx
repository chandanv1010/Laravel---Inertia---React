import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { BANKS, type Bank } from "@/constants/banks"

interface BankSelectProps {
    value?: string;
    onChange: (value: string) => void;
}

export function BankSelect({ value, onChange }: BankSelectProps) {
    const [open, setOpen] = React.useState(false)

    const selectedBank = BANKS.find((bank) => bank.bin === value) || BANKS.find((bank) => bank.code === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto py-2 min-h-[3rem]"
                >
                    {selectedBank ? (
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <div className="h-10 w-12 flex-shrink-0 flex items-center justify-center bg-white rounded-sm border p-0.5">
                                <img src={selectedBank.logo} alt={selectedBank.shortName} className="h-full w-full object-contain" />
                            </div>
                            <div className="flex flex-col items-start text-sm overflow-hidden flex-1">
                                <span className="font-semibold truncate w-full text-left">{selectedBank.shortName}</span>
                                <span className="text-xs text-muted-foreground truncate w-full text-left">{selectedBank.name}</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">Chọn ngân hàng thụ hưởng</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Tìm ngân hàng thụ hưởng..." />
                    <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden overscroll-contain">
                        <CommandEmpty>Không có kết quả tìm kiếm</CommandEmpty>
                        <CommandGroup>
                            {BANKS.map((bank) => (
                                <CommandItem
                                    key={bank.id}
                                    value={bank.name + " " + bank.shortName + " " + bank.code}
                                    onSelect={() => {
                                        onChange(bank.bin)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="h-10 w-12 flex-shrink-0 flex items-center justify-center bg-white rounded-sm border p-0.5">
                                            <img src={bank.logo} alt={bank.shortName} className="h-full w-full object-contain" />
                                        </div>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <span className="font-semibold">{bank.shortName}</span>
                                            <span className="text-xs text-muted-foreground truncate">{bank.name}</span>
                                        </div>
                                    </div>
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4 shrink-0",
                                            value && value === bank.bin ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
