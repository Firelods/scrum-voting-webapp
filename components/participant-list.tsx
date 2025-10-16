"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Participant } from "@/lib/types"
import { Check, Clock, Crown } from "lucide-react"

interface ParticipantListProps {
  participants: Participant[]
  votesRevealed: boolean
}

export function ParticipantList({ participants, votesRevealed }: ParticipantListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Participants</span>
          <Badge variant="secondary">{participants.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex items-center gap-2">
                {participant.isScumMaster && <Crown className="w-4 h-4 text-yellow-500" />}
                <span className="font-medium text-gray-900 dark:text-white">{participant.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {votesRevealed && participant.vote !== null && (
                  <Badge variant="outline" className="font-bold">
                    {participant.vote}
                  </Badge>
                )}
                {!votesRevealed && participant.vote !== null && <Check className="w-5 h-5 text-green-500" />}
                {!votesRevealed && participant.vote === null && <Clock className="w-5 h-5 text-gray-400" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
