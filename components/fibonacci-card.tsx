"use client"

import { cn } from "@/lib/utils"
import type { FibonacciValue } from "@/lib/types"

interface FibonacciCardProps {
  value: FibonacciValue
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  revealed?: boolean
  count?: number
}

export function FibonacciCard({ value, selected, onClick, disabled, revealed, count }: FibonacciCardProps) {
  const displayValue = value === null ? "?" : value

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl transition-all duration-200",
        "w-20 h-28 md:w-24 md:h-32 lg:w-28 lg:h-36",
        "border-2 shadow-lg hover:shadow-xl",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        selected
          ? "bg-blue-600 border-blue-700 text-white scale-105 shadow-2xl"
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-blue-400 hover:scale-105",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        !disabled && !selected && "hover:bg-blue-50 dark:hover:bg-gray-700",
      )}
    >
      <span className="text-3xl md:text-4xl font-bold">{displayValue}</span>
      {revealed && count !== undefined && count > 0 && (
        <span
          className={cn(
            "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            "bg-green-500 text-white border-2 border-white dark:border-gray-900",
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
