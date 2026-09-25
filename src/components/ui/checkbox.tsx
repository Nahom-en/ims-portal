import * as React from "react"
import { Check } from "@phosphor-icons/react"

const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> & { onCheckedChange?: (checked: boolean | "indeterminate") => void, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    return (
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none checked:bg-primary checked:text-primary-foreground ${className}`}
          onChange={(e) => {
            if (onChange) onChange(e)
            if (onCheckedChange) onCheckedChange(e.target.checked)
          }}
          {...props}
        />
        <Check className="absolute h-3 w-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" weight="bold" />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
