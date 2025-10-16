"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Participant } from "@/lib/types";
import { Check, Clock, Crown, Circle } from "lucide-react";

interface ParticipantListProps {
    participants: Participant[];
    votesRevealed: boolean;
}

export function ParticipantList({
    participants,
    votesRevealed,
}: ParticipantListProps) {
    const onlineCount = participants.filter((p) => p.isOnline).length;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>Participants</span>
                    <Badge variant="secondary">{participants.length}</Badge>
                    <Badge
                        variant="outline"
                        className="text-green-600 border-green-600"
                    >
                        <Circle className="w-2 h-2 fill-green-600 mr-1" />
                        {onlineCount} online
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {participants.map((participant) => (
                        <div
                            key={participant.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-opacity ${
                                participant.isOnline
                                    ? "bg-gray-50 dark:bg-gray-800 opacity-100"
                                    : "bg-gray-100 dark:bg-gray-900 opacity-50"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                {/* Indicateur de présence en ligne */}
                                <div className="relative">
                                    {participant.isOnline ? (
                                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                    ) : (
                                        <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />
                                    )}
                                </div>
                                {participant.isScumMaster && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                )}
                                <span
                                    className={`font-medium ${
                                        participant.isOnline
                                            ? "text-gray-900 dark:text-white"
                                            : "text-gray-500 dark:text-gray-600"
                                    }`}
                                >
                                    {participant.name}
                                    {!participant.isOnline && " (offline)"}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Afficher le vote seulement si les votes sont révélés */}
                                {votesRevealed && participant.vote !== null && (
                                    <Badge
                                        variant="outline"
                                        className="font-bold"
                                    >
                                        {participant.vote}
                                    </Badge>
                                )}
                                {/* Sinon afficher juste le statut voté/pas voté */}
                                {!votesRevealed &&
                                    participant.vote !== null && (
                                        <Check className="w-5 h-5 text-green-500" />
                                    )}
                                {!votesRevealed &&
                                    participant.vote === null && (
                                        <Clock className="w-5 h-5 text-gray-400" />
                                    )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
