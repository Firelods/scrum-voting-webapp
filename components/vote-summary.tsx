"use client";

import { useEffect, useState } from "react";
import { getVoteHistory } from "@/app/actions/room-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, Users } from "lucide-react";
import { Loader } from "@/components/ui/loader";

interface VoteHistoryEntry {
    story_id: number;
    story_title: string;
    final_estimate: number | null;
    voted_at: string | null;
    votes: Array<{
        participant_name: string;
        vote_value: number;
    }>;
    statistics: {
        average: number;
        median: number;
        mode: number;
        min: number;
        max: number;
    };
}

interface VoteSummaryProps {
    roomCode: string;
}

export function VoteSummary({ roomCode }: VoteSummaryProps) {
    const [history, setHistory] = useState<VoteHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, [roomCode]);

    const loadHistory = async () => {
        setLoading(true);
        setError(null);
        const result = await getVoteHistory(roomCode);
        if (result.success && result.history) {
            setHistory(result.history);
        } else {
            setError(result.error || "Failed to load vote history");
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="h-8 w-8" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <p>Error: {error}</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No voting history yet.</p>
                <p className="text-sm mt-2">Start voting on stories to see the summary here.</p>
            </div>
        );
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getTotalStoryPoints = () => {
        return history.reduce((sum, entry) => sum + (entry.final_estimate || 0), 0);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Vote Summary</h3>
                    <p className="text-sm text-muted-foreground">
                        {history.length} {history.length === 1 ? "story" : "stories"} voted
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Story Points</p>
                    <p className="text-2xl font-bold">{getTotalStoryPoints()}</p>
                </div>
            </div>

            <div className="space-y-4">
                {history.map((entry) => (
                    <Card key={entry.story_id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <CardTitle className="text-base font-semibold">
                                        {entry.story_title}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Voted on {formatDate(entry.voted_at)}
                                    </p>
                                </div>
                                {entry.final_estimate !== null ? (
                                    <Badge
                                        variant="default"
                                        className="text-lg px-3 py-1 font-bold"
                                    >
                                        {entry.final_estimate} pts
                                    </Badge>
                                ) : (
                                    <Badge variant="outline">No final estimate</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Statistics */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Average</p>
                                    <p className="text-lg font-semibold">
                                        {entry.statistics.average.toFixed(1)}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Median</p>
                                    <p className="text-lg font-semibold">
                                        {entry.statistics.median}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Mode</p>
                                    <p className="text-lg font-semibold">
                                        {entry.statistics.mode}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Range</p>
                                    <p className="text-lg font-semibold">
                                        {entry.statistics.min}-{entry.statistics.max}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">
                                        <Users className="h-3 w-3 inline mr-1" />
                                        Voters
                                    </p>
                                    <p className="text-lg font-semibold">{entry.votes.length}</p>
                                </div>
                            </div>

                            {/* Individual Votes */}
                            <div>
                                <p className="text-xs text-muted-foreground mb-2 font-medium">
                                    Individual Votes:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {entry.votes.map((vote, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5"
                                        >
                                            <span className="text-sm font-medium">
                                                {vote.participant_name}
                                            </span>
                                            <Badge variant="secondary" className="font-bold">
                                                {vote.vote_value}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Consensus Indicator */}
                            <div>
                                {entry.statistics.min === entry.statistics.max ? (
                                    <Badge variant="default" className="bg-green-600">
                                        Perfect Consensus
                                    </Badge>
                                ) : entry.statistics.max - entry.statistics.min <= 3 ? (
                                    <Badge variant="default" className="bg-blue-600">
                                        High Consensus
                                    </Badge>
                                ) : entry.statistics.max - entry.statistics.min <= 8 ? (
                                    <Badge variant="default" className="bg-yellow-600">
                                        Moderate Consensus
                                    </Badge>
                                ) : (
                                    <Badge variant="default" className="bg-red-600">
                                        Low Consensus
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
