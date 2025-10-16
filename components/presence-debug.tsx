"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Room } from "@/lib/types";

interface PresenceDebugProps {
    room: Room | null | undefined;
    participantId: string | null;
}

export function PresenceDebug({ room, participantId }: PresenceDebugProps) {
    const [showDebug, setShowDebug] = useState(false);

    useEffect(() => {
        // Show debug if ?debug=true in URL
        const params = new URLSearchParams(window.location.search);
        setShowDebug(params.get("debug") === "true");
    }, []);

    if (!showDebug || !room) return null;

    const onlineParticipants = room.participants.filter((p) => p.isOnline);
    const offlineParticipants = room.participants.filter((p) => !p.isOnline);

    return (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
            <CardHeader>
                <CardTitle className="text-sm">
                    🐛 Debug Presence (add ?debug=true to URL)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div>
                    <strong>Current Participant ID:</strong>{" "}
                    {participantId || "null"}
                </div>
                <div>
                    <strong>Total Participants:</strong>{" "}
                    {room.participants.length}
                </div>
                <div>
                    <strong>Online:</strong>{" "}
                    {onlineParticipants.map((p) => (
                        <Badge key={p.id} variant="outline" className="ml-1">
                            {p.name}
                        </Badge>
                    ))}
                </div>
                <div>
                    <strong>Offline:</strong>{" "}
                    {offlineParticipants.map((p) => (
                        <Badge key={p.id} variant="secondary" className="ml-1">
                            {p.name}
                        </Badge>
                    ))}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    Check browser console for detailed presence logs
                </div>
            </CardContent>
        </Card>
    );
}
