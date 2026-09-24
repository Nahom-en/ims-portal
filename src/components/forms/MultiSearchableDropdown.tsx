"use client"

import React, { useState, useEffect, useRef } from "react"
import { Check, CaretUpDown, X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export interface SearchableOption {
  id: string
  label: string
  subLabel?: string
}

interface MultiSearchableDropdownProps {
  values: string[]
  onChange: (vals: string[]) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
}

export function MultiSearchableDropdown({ 
  values, 
  onChange, 
  options, 
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found."
}: MultiSearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapperRef = useRef<HTMLDivElement>(null)

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

  const toggleOption = (id: string) => {
    if (values.includes(id)) {
      onChange(values.filter(v => v !== id))
    } else {
      onChange([...values, id])
    }
  }

  const removeOption = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    onChange(values.filter(v => v !== id))
  }

  return (
    <div className="w-full space-y-2">
      <div className="relative w-full" ref={wrapperRef}>
        <div 
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
        >
          <span className="truncate">{placeholder}</span>
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
                filteredOptions.map((opt) => {
                  const isSelected = values.includes(opt.id)
                  return (
                    <div
                      key={opt.id}
                      className={cn(
                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        isSelected && "bg-accent/50"
                      )}
                      onClick={() => toggleOption(opt.id)}
                    >
                      <Check className={cn("mr-2 h-4 w-4 text-primary", isSelected ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span>{highlightMatch(opt.label)}</span>
                        {opt.subLabel && <span className="text-xs text-muted-foreground">{highlightMatch(opt.subLabel)}</span>}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Chips below the input */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {values.map(val => {
            const opt = options.find(o => o.id === val)
            if (!opt) return null
            return (
              <div 
                key={val} 
                className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium border border-primary/20"
              >
                <span>{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeOption(e, val)}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Remove</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
