"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserX, Crown, User } from "lucide-react";
import { kickParticipant } from "@/app/actions/room-actions";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface Participant {
    id: string;
    name: string;
    isScumMaster: boolean;
    isOnline?: boolean;
}

interface ParticipantsManagerProps {
    roomCode: string;
    participants: Participant[];
    currentUserId?: string;
}

export function ParticipantsManager({
    roomCode,
    participants,
    currentUserId,
}: ParticipantsManagerProps) {
    const [kickingName, setKickingName] = useState<string | null>(null);
    const [isKicking, setIsKicking] = useState(false);

    const handleKick = async (participantName: string) => {
        setIsKicking(true);
        try {
            const result = await kickParticipant(roomCode, participantName);
            if (!result.success) {
                alert(result.error || "Failed to kick participant");
            }
        } catch (error) {
            console.error("Failed to kick participant:", error);
            alert("Failed to kick participant");
        } finally {
            setIsKicking(false);
            setKickingName(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Participants ({participants.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {participants.map((participant) => (
                            <div
                                key={participant.id}
                                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    {participant.isScumMaster ? (
                                        <Crown className="w-5 h-5 text-yellow-500" />
                                    ) : (
                                        <User className="w-5 h-5 text-gray-400" />
                                    )}
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {participant.name}
                                            </span>
                                            {participant.id === currentUserId && (
                                                <Badge variant="secondary">
                                                    You
                                                </Badge>
                                            )}
                                            {participant.isScumMaster && (
                                                <Badge variant="default">
                                                    Scrum Master
                                                </Badge>
                                            )}
                                        </div>
                                        {participant.isOnline !== undefined && (
                                            <span
                                                className={`text-xs ${
                                                    participant.isOnline
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                {participant.isOnline
                                                    ? "Online"
                                                    : "Offline"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!participant.isScumMaster && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setKickingName(participant.name)
                                        }
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                        <UserX className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Dialog
                open={kickingName !== null}
                onOpenChange={(open) => !open && setKickingName(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Kick Participant</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove{" "}
                            <strong>{kickingName}</strong> from the room? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setKickingName(null)}
                            disabled={isKicking}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => kickingName && handleKick(kickingName)}
                            disabled={isKicking}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {isKicking ? "Kicking..." : "Kick"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
