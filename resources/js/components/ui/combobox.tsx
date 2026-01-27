import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { removeVietnameseTones } from "@/lib/helper"
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

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  popoverClassName?: string
  name?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  popoverClassName,
  name,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)

  // Custom filter function to support Vietnamese search without diacritics
  const filterOptions = React.useCallback((searchValue: string) => {
    if (!searchValue) return options
    
    const normalizedSearch = removeVietnameseTones(searchValue)
    
    return options.filter((option) => {
      const normalizedLabel = removeVietnameseTones(option.label)
      const normalizedValue = removeVietnameseTones(option.value)
      
      return (
        normalizedLabel.includes(normalizedSearch) ||
        normalizedValue.includes(normalizedSearch) ||
        option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.value.toLowerCase().includes(searchValue.toLowerCase())
      )
    })
  }, [options])

  const filteredOptions = React.useMemo(() => {
    return filterOptions(search)
  }, [search, filterOptions])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal cursor-pointer",
            !selectedOption && "text-muted-foreground",
            className
          )}
          style={{ fontSize: '12px' }}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("p-0", popoverClassName)} 
        align="start"
        style={{ width: 'var(--radix-popover-trigger-width, 200px)' }}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onSelect={() => {
                    if (option.value !== value) {
                      onValueChange?.(option.value)
                    }
                    setOpen(false)
                    setSearch("")
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      {name && (
        <input
          type="hidden"
          name={name}
          value={value || ""}
        />
      )}
    </Popover>
  )
}

