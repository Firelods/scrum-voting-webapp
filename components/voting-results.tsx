"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Room } from "@/lib/types";
import {
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Cell,
} from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { TrendingUp, Users, Target, Clock } from "lucide-react";

interface VotingResultsProps {
    room: Room;
}

export function VotingResults({ room }: VotingResultsProps) {
    if (!room.votesRevealed) return null;

    // Calculate statistics - only count online participants who are voters
    const onlineVoters = room.participants.filter((p) => p.isOnline && p.isVoter);
    const votes = onlineVoters
        .map((p) => p.vote)
        .filter((v) => v !== null) as number[];

    const timeVotes = onlineVoters
        .map((p) => p.timeVote)
        .filter((v) => v !== null) as number[];

    const hasVotes = votes.length > 0;
    const hasTimeVotes = timeVotes.length > 0 && room.timeEstimationEnabled;

    if (!hasVotes && !hasTimeVotes) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Voting Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                        No votes submitted yet.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Story points statistics
    let average = 0;
    let median = 0;
    let mode = 0;
    let voteCounts = new Map<number, number>();

    if (hasVotes) {
        average = votes.reduce((sum, vote) => sum + vote, 0) / votes.length;
        const sortedVotes = [...votes].sort((a, b) => a - b);
        median = sortedVotes[Math.floor(votes.length / 2)];

        // Calculate vote counts
        votes.forEach((vote) => {
            voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
        });

        // Calculate mode (most common vote) correctly
        mode = Array.from(voteCounts.entries()).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];
    }

    // Time estimation statistics
    let timeAverage = 0;
    let timeMedian = 0;
    let timeMode = 0;
    let timeVoteCounts = new Map<number, number>();

    if (hasTimeVotes) {
        timeAverage = timeVotes.reduce((sum, vote) => sum + vote, 0) / timeVotes.length;
        const sortedTimeVotes = [...timeVotes].sort((a, b) => a - b);
        timeMedian = sortedTimeVotes[Math.floor(timeVotes.length / 2)];

        // Calculate time vote counts
        timeVotes.forEach((vote) => {
            timeVoteCounts.set(vote, (timeVoteCounts.get(vote) || 0) + 1);
        });

        // Calculate mode for time votes
        timeMode = Array.from(timeVoteCounts.entries()).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];
    }

    // Prepare chart data

    // Define distinct colors for better visibility
    const colors = [
        "hsl(210, 100%, 56%)", // Blue
        "hsl(340, 82%, 52%)", // Pink/Red
        "hsl(291, 64%, 42%)", // Purple
        "hsl(168, 76%, 42%)", // Teal
        "hsl(48, 96%, 53%)", // Yellow
        "hsl(24, 90%, 50%)", // Orange
        "hsl(142, 71%, 45%)", // Green
        "hsl(199, 89%, 48%)", // Light Blue
        "hsl(0, 72%, 51%)", // Red
        "hsl(262, 52%, 47%)", // Violet
    ];

    const chartData = Array.from(voteCounts.entries())
        .map(([value, count], index) => ({
            value: value.toString(),
            numericValue: value,
            count,
            fill: colors[index % colors.length],
        }))
        .sort((a, b) => a.numericValue - b.numericValue);

    // Determine consensus level
    const maxCount = hasVotes ? Math.max(...Array.from(voteCounts.values())) : 0;
    const consensusPercentage = hasVotes ? (maxCount / votes.length) * 100 : 0;

    const timeMaxCount = hasTimeVotes ? Math.max(...Array.from(timeVoteCounts.values())) : 0;
    const timeConsensusPercentage = hasTimeVotes ? (timeMaxCount / timeVotes.length) * 100 : 0;

    // Helper to format time
    const formatTime = (hours: number): string => {
        if (hours < 1) {
            return `${Math.round(hours * 60)}m`;
        } else if (hours >= 8) {
            const days = hours / 8;
            if (days % 1 === 0) return `${days}d`;
            return `${days.toFixed(1)}d`;
        }
        return `${hours}h`;
    };

    return (
        <>
        {hasVotes && (
        <Card className="border-2 border-green-500">
            <CardHeader>
                <CardTitle>Story Points Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Average
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {average.toFixed(1)}
                        </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Median
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {median}
                        </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Most Common
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {mode}
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Vote Distribution
                    </h3>
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
                                <XAxis
                                    dataKey="value"
                                    label={{
                                        value: "Story Points",
                                        position: "insideBottom",
                                        offset: -5,
                                    }}
                                />
                                <YAxis
                                    label={{
                                        value: "Number of Votes",
                                        angle: -90,
                                        position: "insideLeft",
                                    }}
                                />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.fill}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Consensus Indicator */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Team Consensus
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {consensusPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                                consensusPercentage >= 70
                                    ? "bg-green-500 dark:bg-green-600"
                                    : "bg-yellow-500 dark:bg-yellow-600"
                            }`}
                            style={{ width: `${consensusPercentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {consensusPercentage >= 70
                            ? "Strong agreement! The team is aligned on this estimate."
                            : "Consider discussing the different perspectives before finalizing."}
                    </p>
                </div>
            </CardContent>
        </Card>
        )}

        {hasTimeVotes && (
        <Card className="border-2 border-amber-500">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    Time Estimation Results
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Average
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatTime(timeAverage)}
                        </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Median
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatTime(timeMedian)}
                        </p>
                    </div>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <Users className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Most Common
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatTime(timeMode)}
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Time Vote Distribution
                    </h3>
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
                            <BarChart data={Array.from(timeVoteCounts.entries())
                                .map(([value, count], index) => ({
                                    value: formatTime(value),
                                    numericValue: value,
                                    count,
                                    fill: colors[index % colors.length],
                                }))
                                .sort((a, b) => a.numericValue - b.numericValue)}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="value"
                                    label={{
                                        value: "Hours",
                                        position: "insideBottom",
                                        offset: -5,
                                    }}
                                />
                                <YAxis
                                    label={{
                                        value: "Number of Votes",
                                        angle: -90,
                                        position: "insideLeft",
                                    }}
                                />
                                <ChartTooltip
                                    content={<ChartTooltipContent />}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {Array.from(timeVoteCounts.entries())
                                        .map(([value], index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={colors[index % colors.length]}
                                            />
                                        ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </div>

                {/* Consensus Indicator */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Team Consensus
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {timeConsensusPercentage.toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                            className={`h-3 rounded-full transition-all duration-300 ${
                                timeConsensusPercentage >= 70
                                    ? "bg-amber-500 dark:bg-amber-600"
                                    : "bg-yellow-500 dark:bg-yellow-600"
                            }`}
                            style={{ width: `${timeConsensusPercentage}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        {timeConsensusPercentage >= 70
                            ? "Strong agreement on time estimation!"
                            : "Consider discussing the time estimates before finalizing."}
                    </p>
                </div>
            </CardContent>
        </Card>
        )}
        </>
    );
}
