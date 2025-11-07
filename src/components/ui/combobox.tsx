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

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  emptyText = "No item found. Type to add custom.",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Handle selection from dropdown
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setOpen(false)
    setSearchValue("")
  }

  // Handle custom input (when user types and presses Enter)
  const handleCustomInput = (inputValue: string) => {
    if (inputValue.trim()) {
      onChange(inputValue.trim())
      setOpen(false)
      setSearchValue("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between border-slate-300 focus:border-blue-400 focus:ring-blue-400 hover:bg-slate-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type custom name..."
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchValue.trim()) {
                e.preventDefault()
                handleCustomInput(searchValue)
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 px-2 text-sm text-slate-600">
                {emptyText}
                {searchValue && (
                  <div className="mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-normal"
                      onClick={() => handleCustomInput(searchValue)}
                    >
                      <Check className="mr-2 h-4 w-4 opacity-0" />
                      Use "{searchValue}"
                    </Button>
                  </div>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
