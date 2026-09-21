"use client"

import React, { useState, useEffect, useRef } from "react"
import { Check, CaretUpDown } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SearchableOption {
  id: string
  label: string
  subLabel?: string
}

interface SearchableDropdownProps {
  value: string | null
  onChange: (val: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

export function SearchableDropdown({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found."
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.id === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery("") // clear search when closing
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredOptions = options.filter(o => {
    const q = query.toLowerCase()
    return o.label.toLowerCase().includes(q) || (o.subLabel && o.subLabel.toLowerCase().includes(q))
  })

  const highlightMatch = (text: string) => {
    if (!query) return text
    // Escape query for regex
    const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={i} className="text-primary font-bold">{part}</span> 
            : part
        )}
      </>
    )
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
          !value && "text-muted-foreground"
        )}
        onClick={() => setOpen(!open)}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <CaretUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>

      {open && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none z-50">
          <div className="flex items-center border-b px-3">
            <input 
              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer"
                  onClick={() => {
                    onChange(opt.id)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{highlightMatch(opt.label)}</span>
                    {opt.subLabel && <span className="text-xs text-muted-foreground">{highlightMatch(opt.subLabel)}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
