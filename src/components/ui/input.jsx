import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef(/** @param {React.InputHTMLAttributes<HTMLInputElement>} props */ ({ className, type, id, ...props }, ref) => {
  const [passwordVisible, setPasswordVisible] = React.useState(false)
  const generatedId = React.useId()
  const isPassword = type === "password"
  const inputId = id ?? (isPassword ? generatedId : undefined)
  const toggleLabel = passwordVisible ? "Nascondi password" : "Mostra password"

  const input = (
    <input
      id={inputId}
      type={isPassword && passwordVisible ? "text" : type}
      className={cn(
        "flex h-9 w-full min-w-0 max-w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
        isPassword && "min-h-11 pr-12 [&::-ms-reveal]:hidden"
      )}
      ref={ref}
      {...props} />
  )

  if (!isPassword) return input

  return (
    <div className="relative w-full min-w-0">
      {input}
      <button
        type="button"
        aria-label={toggleLabel}
        aria-controls={inputId}
        title={toggleLabel}
        disabled={props.disabled}
        onClick={() => setPasswordVisible(visible => !visible)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {passwordVisible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
})
Input.displayName = "Input"

export { Input }
