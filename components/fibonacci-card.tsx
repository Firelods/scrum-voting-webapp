"use client"

import { cn } from "@/lib/utils"
import type { VoteValue } from "@/lib/types"
import { formatVoteValue, isUnknownVote } from "@/lib/constants"

interface FibonacciCardProps {
  value: VoteValue
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  revealed?: boolean
  count?: number
}

export function FibonacciCard({ value, selected, onClick, disabled, revealed, count }: FibonacciCardProps) {
  const displayValue = formatVoteValue(value)
  const unknown = isUnknownVote(value)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl transition-all duration-200",
        "w-16 h-24 md:w-20 md:h-28 lg:w-24 lg:h-32",
        "border-2 shadow-lg hover:shadow-xl",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        selected
          ? "bg-blue-600 border-blue-700 text-white scale-105 shadow-2xl"
          : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-blue-400 hover:scale-105",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100",
        !disabled && !selected && "hover:bg-blue-50 dark:hover:bg-gray-700",
      )}
    >
      <span className="text-2xl md:text-3xl lg:text-4xl font-bold">{displayValue}</span>
      {unknown && (
        <span className="mt-1 text-[10px] md:text-xs font-medium uppercase tracking-wide opacity-70">
          Unsure
        </span>
      )}
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
