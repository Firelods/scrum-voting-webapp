"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface VotingTimerProps {
  timerSeconds: number | null
  timerStartedAt: number | null
  votingActive: boolean
}

export function VotingTimer({ timerSeconds, timerStartedAt, votingActive }: VotingTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  useEffect(() => {
    if (!votingActive || !timerSeconds || !timerStartedAt) {
      setTimeRemaining(0)
      return
    }

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000)
      const remaining = Math.max(0, timerSeconds - elapsed)
      setTimeRemaining(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [timerSeconds, timerStartedAt, votingActive])

  if (!votingActive || !timerSeconds || timeRemaining === 0) {
    return null
  }

  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60
  const percentage = (timeRemaining / timerSeconds) * 100
  const isLowTime = percentage < 25

  return (
    <Card className={cn("border-2", isLowTime ? "border-red-500 animate-pulse" : "border-blue-500")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Clock className={cn("w-6 h-6", isLowTime ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-blue-400")} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Remaining</span>
              <span className={cn("text-2xl font-bold", isLowTime ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white")}>
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-1000",
                  isLowTime ? "bg-red-500 dark:bg-red-600" : "bg-blue-500 dark:bg-blue-600",
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
