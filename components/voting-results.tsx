"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Room } from "@/lib/types"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { TrendingUp, Users, Target } from "lucide-react"

interface VotingResultsProps {
  room: Room
}

export function VotingResults({ room }: VotingResultsProps) {
  if (!room.votesRevealed) return null

  // Calculate statistics
  const votes = room.participants.map((p) => p.vote).filter((v) => v !== null) as number[]

  if (votes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voting Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 dark:text-gray-400 py-8">No votes submitted yet.</p>
        </CardContent>
      </Card>
    )
  }

  const average = votes.reduce((sum, vote) => sum + vote, 0) / votes.length
  const median = [...votes].sort((a, b) => a - b)[Math.floor(votes.length / 2)]
  const mode = votes.sort((a, b) => votes.filter((v) => v === a).length - votes.filter((v) => v === b).length).pop()

  // Prepare chart data
  const voteCounts = new Map<number, number>()
  votes.forEach((vote) => {
    voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1)
  })

  const chartData = Array.from(voteCounts.entries())
    .map(([value, count]) => ({
      value: value.toString(),
      count,
      fill: `hsl(${(value / 100) * 120}, 70%, 50%)`, // Color gradient from red to green
    }))
    .sort((a, b) => Number(a.value) - Number(b.value))

  // Determine consensus level
  const maxCount = Math.max(...Array.from(voteCounts.values()))
  const consensusPercentage = (maxCount / votes.length) * 100
  const hasConsensus = consensusPercentage >= 70

  return (
    <Card className="border-2 border-green-500">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Voting Results</span>
          {hasConsensus && <Badge className="bg-green-500">Strong Consensus</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Average</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{average.toFixed(1)}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Median</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{median}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Most Common</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{mode}</p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vote Distribution</h3>
          <ChartContainer
            config={{
              count: {
                label: "Votes",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[200px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="value" label={{ value: "Story Points", position: "insideBottom", offset: -5 }} />
                <YAxis label={{ value: "Number of Votes", angle: -90, position: "insideLeft" }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Consensus Indicator */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Team Consensus</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{consensusPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                hasConsensus ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${consensusPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            {hasConsensus
              ? "Strong agreement! The team is aligned on this estimate."
              : "Consider discussing the different perspectives before finalizing."}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
