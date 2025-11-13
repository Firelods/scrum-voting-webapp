"use client";

import type React from "react";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    revealVotes,
    startVoting,
    nextStory,
    addStoryToQueue,
    addMultipleStoriesToQueue,
    setFinalEstimate,
    updateJiraBaseUrl,
} from "@/app/actions/room-actions";
import type { Room } from "@/lib/types";
import { logger } from "@/lib/logger";
import {
    Play,
    Eye,
    SkipForward,
    Plus,
    RotateCcw,
    Users,
    List,
    TrendingUp,
    Save,
    Settings,
} from "lucide-react";
import { ParticipantsManager } from "./participants-manager";
import { StoryQueueManager } from "./story-queue-manager";
import { VoteSummary } from "./vote-summary";

interface ScrumMasterPanelProps {
    room: Room;
    onUpdate: () => void;
    currentUserId?: string;
}

export function ScrumMasterPanel({
    room,
    onUpdate,
    currentUserId,
}: ScrumMasterPanelProps) {
    const [isAddingStory, setIsAddingStory] = useState(false);
    const [storyTitle, setStoryTitle] = useState("");
    const [multipleStories, setMultipleStories] = useState("");
    const [jiraLink, setJiraLink] = useState("");
    const [isMultipleMode, setIsMultipleMode] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState<number>(2);
    const [showSettings, setShowSettings] = useState(false);
    const [jiraBaseUrl, setJiraBaseUrl] = useState(room.jiraBaseUrl || "");
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [showStoryQueue, setShowStoryQueue] = useState(false);
    const [isStartingVote, setIsStartingVote] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const [isMovingNext, setIsMovingNext] = useState(false);
    const [isAddingToQueue, setIsAddingToQueue] = useState(false);
    const [showVoteSummary, setShowVoteSummary] = useState(false);
    const [showFinalEstimate, setShowFinalEstimate] = useState(false);
    const [finalEstimateValue, setFinalEstimateValue] = useState<number>(0);
    const [isSavingEstimate, setIsSavingEstimate] = useState(false);

    const handleStartVoting = async () => {
        setIsStartingVote(true);
        try {
            const timerSeconds =
                timerMinutes > 0 ? timerMinutes * 60 : undefined;
            // Ne pas passer currentStory car elle est déjà dans la queue
            await startVoting(room.code, undefined, timerSeconds);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to start voting:", error);
        } finally {
            setIsStartingVote(false);
        }
    };

    const handleRevealVotes = async () => {
        setIsRevealing(true);
        try {
            await revealVotes(room.code);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to reveal votes:", error);
        } finally {
            setIsRevealing(false);
        }
    };

    const handleNextStory = async () => {
        setIsMovingNext(true);
        try {
            await nextStory(room.code);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to move to next story:", error);
        } finally {
            setIsMovingNext(false);
        }
    };

    const handleAddStory = async (e: React.FormEvent) => {
        e.preventDefault();

        setIsAddingToQueue(true);
        try {
            if (isMultipleMode) {
                // Parse multiple stories from textarea
                const lines = multipleStories.split('\n').filter(line => line.trim());
                if (lines.length === 0) {
                    alert("Please enter at least one story");
                    setIsAddingToQueue(false);
                    return;
                }

                const stories = lines.map(line => {
                    const title = line.trim();
                    // Check if the line contains a Jira ID (2-5 digits)
                    const jiraMatch = title.match(/(\d{2,5})/);
                    let jiraLink: string | undefined = undefined;

                    if (jiraMatch && room.jiraBaseUrl) {
                        jiraLink = room.jiraBaseUrl + jiraMatch[1];
                    }

                    return {
                        title,
                        jiraLink,
                    };
                });

                await addMultipleStoriesToQueue(room.code, stories);
                setMultipleStories("");
            } else {
                // Single story mode
                if (!storyTitle.trim()) {
                    alert("Please enter a story title");
                    setIsAddingToQueue(false);
                    return;
                }

                const story = {
                    id: `story-${Date.now()}`,
                    title: storyTitle,
                    jiraLink: jiraLink || undefined,
                };
                await addStoryToQueue(room.code, story);
                setStoryTitle("");
                setJiraLink("");
            }

            setIsAddingStory(false);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to add story:", error);
        } finally {
            setIsAddingToQueue(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        try {
            await updateJiraBaseUrl(room.code, jiraBaseUrl);
            setShowSettings(false);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to save settings:", error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleSaveFinalEstimate = async () => {
        if (!room.currentStory) return;

        setIsSavingEstimate(true);
        try {
            await setFinalEstimate(
                room.code,
                room.currentStory.id,
                finalEstimateValue
            );
            setShowFinalEstimate(false);
            // WebSocket will automatically trigger an update
        } catch (error) {
            logger.error("Failed to save final estimate:", error);
        } finally {
            setIsSavingEstimate(false);
        }
    };

    // Calculate suggested estimate from votes
    const getSuggestedEstimate = () => {
        const voters = room.participants.filter((p) => p.vote !== null);
        if (voters.length === 0) return 0;

        const votes = voters.map((p) => p.vote as number);
        const sorted = [...votes].sort((a, b) => a - b);
        const median =
            sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)];

        return Math.round(median);
    };

    // Only count online participants who are voters
    const onlineVoters = room.participants.filter((p) => p.isOnline && p.isVoter);
    const votedCount = onlineVoters.filter((p) => p.vote !== null).length;
    const totalCount = onlineVoters.length;

    return (
        <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Scrum Master Controls</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Voting Status */}
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Voting Progress
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {votedCount} / {totalCount}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 dark:bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{
                                width: `${
                                    totalCount > 0
                                        ? (votedCount / totalCount) * 100
                                        : 0
                                }%`,
                            }}
                        />
                    </div>
                </div>

                {/* Timer Setting */}
                {!room.votingActive && !room.votesRevealed && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <Label
                            htmlFor="timer"
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Timer (minutes, 0 = no timer)
                        </Label>
                        <Input
                            id="timer"
                            type="number"
                            min="0"
                            max="10"
                            value={timerMinutes}
                            onChange={(e) =>
                                setTimerMinutes(Number(e.target.value))
                            }
                            className="mt-1"
                        />
                    </div>
                )}

                {/* Control Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {!room.votingActive && !room.votesRevealed && (
                        <>
                            <Button
                                onClick={handleStartVoting}
                                className="w-full"
                                size="lg"
                                disabled={!room.currentStory || isStartingVote}
                            >
                                {isStartingVote ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Voting
                                    </>
                                )}
                            </Button>
                            <Dialog
                                open={isAddingStory}
                                onOpenChange={setIsAddingStory}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-transparent"
                                        size="lg"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Story
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Add {isMultipleMode ? "Stories" : "Story"} to Queue
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form
                                        onSubmit={handleAddStory}
                                        className="space-y-4"
                                    >
                                        <div className="flex gap-2 mb-2">
                                            <Button
                                                type="button"
                                                variant={!isMultipleMode ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setIsMultipleMode(false)}
                                                className="flex-1"
                                            >
                                                Single Story
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={isMultipleMode ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setIsMultipleMode(true)}
                                                className="flex-1"
                                            >
                                                Multiple Stories
                                            </Button>
                                        </div>

                                        {!isMultipleMode ? (
                                            <>
                                                <div>
                                                    <Label htmlFor="storyTitle">
                                                        Story Title
                                                    </Label>
                                                    <Input
                                                        id="storyTitle"
                                                        placeholder="Enter story title"
                                                        value={storyTitle}
                                                        onChange={(e) =>
                                                            setStoryTitle(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="mt-1"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="jiraLink">
                                                        Jira Link (optional)
                                                    </Label>
                                                    <Input
                                                        id="jiraLink"
                                                        type="url"
                                                        placeholder="https://..."
                                                        value={jiraLink}
                                                        onChange={(e) =>
                                                            setJiraLink(e.target.value)
                                                        }
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div>
                                                <Label htmlFor="multipleStories">
                                                    Stories (one per line)
                                                </Label>
                                                <Textarea
                                                    id="multipleStories"
                                                    placeholder="Story 1&#10;Story 2 ACTRLD-1234&#10;Story 3"
                                                    value={multipleStories}
                                                    onChange={(e) =>
                                                        setMultipleStories(e.target.value)
                                                    }
                                                    className="mt-1 min-h-32"
                                                    required
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {room.jiraBaseUrl
                                                        ? "If a line contains a 2-5 digit number, it will be used as Jira ID"
                                                        : "Set Jira base URL in settings to auto-link tickets"}
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                type="submit"
                                                className="flex-1"
                                                disabled={isAddingToQueue}
                                            >
                                                {isAddingToQueue ? (
                                                    <>
                                                        <Loader size="sm" className="mr-2" />
                                                        Adding...
                                                    </>
                                                ) : (
                                                    `Add to Queue`
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setIsAddingStory(false)
                                                }
                                                disabled={isAddingToQueue}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}

                    {room.votingActive && (
                        <Button
                            onClick={handleRevealVotes}
                            className="w-full col-span-2"
                            size="lg"
                            variant="default"
                            disabled={isRevealing}
                        >
                            {isRevealing ? (
                                <>
                                    <Loader size="sm" className="mr-2" />
                                    Revealing...
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Reveal Votes
                                </>
                            )}
                        </Button>
                    )}

                    {room.votesRevealed && (
                        <>
                            <Dialog
                                open={showFinalEstimate}
                                onOpenChange={setShowFinalEstimate}
                            >
                                <DialogTrigger asChild>
                                    <Button
                                        variant="default"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        size="lg"
                                        onClick={() => {
                                            setFinalEstimateValue(getSuggestedEstimate());
                                            setShowFinalEstimate(true);
                                        }}
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        Set Final Estimate
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Set Final Estimate</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">
                                            After discussion, what is the final estimate for this story?
                                        </p>
                                        <div>
                                            <Label htmlFor="finalEstimate">
                                                Story Points
                                            </Label>
                                            <Input
                                                id="finalEstimate"
                                                type="number"
                                                value={finalEstimateValue}
                                                onChange={(e) =>
                                                    setFinalEstimateValue(
                                                        parseInt(e.target.value) || 0
                                                    )
                                                }
                                                className="mt-1"
                                                min="0"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Suggested: {getSuggestedEstimate()} (median of votes)
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSaveFinalEstimate}
                                                className="flex-1"
                                                disabled={isSavingEstimate}
                                            >
                                                {isSavingEstimate ? (
                                                    <>
                                                        <Loader size="sm" className="mr-2" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    "Save Estimate"
                                                )}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowFinalEstimate(false)}
                                                disabled={isSavingEstimate}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Button
                                onClick={handleNextStory}
                                className="w-full"
                                size="lg"
                                disabled={isMovingNext}
                            >
                                {isMovingNext ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <SkipForward className="w-4 h-4 mr-2" />
                                        Next Story
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleStartVoting}
                                variant="outline"
                                className="w-full bg-transparent"
                                size="lg"
                                disabled={isStartingVote}
                            >
                                {isStartingVote ? (
                                    <>
                                        <Loader size="sm" className="mr-2" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Re-vote
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>

                {/* Quick Actions */}
                {!room.currentStory && room.storyQueue.length === 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Get started by adding your first story to the queue.
                        </p>
                        <Button
                            onClick={() => setIsAddingStory(true)}
                            variant="outline"
                            size="sm"
                            className="w-full"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Story
                        </Button>
                    </div>
                )}

                {!room.currentStory && room.storyQueue.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                            Ready to start! Click "Start Voting" to begin with
                            the first story in the queue.
                        </p>
                    </div>
                )}

                {/* Advanced Management Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Dialog
                        open={showParticipants}
                        onOpenChange={setShowParticipants}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Manage Participants
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Manage Participants</DialogTitle>
                            </DialogHeader>
                            <ParticipantsManager
                                roomCode={room.code}
                                participants={room.participants}
                                currentUserId={currentUserId}
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={showStoryQueue}
                        onOpenChange={setShowStoryQueue}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <List className="w-4 h-4 mr-2" />
                                Manage Queue
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Manage Story Queue</DialogTitle>
                            </DialogHeader>
                            <StoryQueueManager
                                roomCode={room.code}
                                stories={room.storyQueue}
                                currentStoryId={room.currentStory?.id}
                            />
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={showVoteSummary}
                        onOpenChange={setShowVoteSummary}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <TrendingUp className="w-4 h-4 mr-2" />
                                View Vote Summary
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Vote Summary & History</DialogTitle>
                            </DialogHeader>
                            <VoteSummary roomCode={room.code} />
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={showSettings}
                        onOpenChange={setShowSettings}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Room Settings</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="jiraBaseUrl">
                                        Jira Base URL (optional)
                                    </Label>
                                    <Input
                                        id="jiraBaseUrl"
                                        type="url"
                                        placeholder="https://jira.example.com/browse/PROJECT-"
                                        value={jiraBaseUrl}
                                        onChange={(e) =>
                                            setJiraBaseUrl(e.target.value)
                                        }
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        When importing multiple stories, 2-5 digit numbers will be automatically linked using this base URL
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleSaveSettings}
                                        className="flex-1"
                                        disabled={isSavingSettings}
                                    >
                                        {isSavingSettings ? (
                                            <>
                                                <Loader size="sm" className="mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            "Save Settings"
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowSettings(false)}
                                        disabled={isSavingSettings}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    );
}
