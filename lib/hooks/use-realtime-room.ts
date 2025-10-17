"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getRoomState } from "@/app/actions/room-actions";
import type { Room } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeRoom(
    code: string | null,
    participantId: string | null = null
) {
    const [room, setRoom] = useState<Room | null | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [isKicked, setIsKicked] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const mutateRef = useRef<(() => Promise<void>) | null>(null);
    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to manually fetch room state
    const mutate = async () => {
        if (!code) return;
        try {
            const result = await getRoomState(code);
            if (result.success && result.room) {
                setRoom(result.room);
                
                // Check if the current participant still exists in the room
                if (participantId) {
                    const participantExists = result.room.participants.some(
                        (p) => p.id === participantId
                    );
                    if (!participantExists) {
                        console.warn("⚠️ Participant has been kicked from the room");
                        setIsKicked(true);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch room state:", error);
        }
    };

    // Keep mutate ref updated
    mutateRef.current = mutate;

    // Send heartbeat to mark this participant as online
    useEffect(() => {
        if (!code || !participantId) return;

        const sendHeartbeat = async () => {
            try {
                const { data, error } = await supabase
                    .from("participants")
                    .update({ last_seen: new Date().toISOString() })
                    .eq("room_code", code)
                    .eq("name", participantId)
                    .select();

                // If no rows were updated, the participant was removed
                if (!error && (!data || data.length === 0)) {
                    console.warn("⚠️ Participant no longer exists in room");
                    setIsKicked(true);
                }
                
                if (error) {
                    console.error("Heartbeat error:", error);
                }
            } catch (error) {
                console.error("Heartbeat error:", error);
            }
        };

        // Send initial heartbeat
        sendHeartbeat();

        // Send heartbeat every 5 seconds
        const interval = setInterval(sendHeartbeat, 5000);
        heartbeatIntervalRef.current = interval;

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
            }
        };
    }, [code, participantId]);

    useEffect(() => {
        if (!code) {
            setRoom(null);
            setIsLoading(false);
            return;
        }

        // Initial fetch
        const fetchInitialState = async () => {
            try {
                setIsLoading(true);
                const result = await getRoomState(code);
                if (result.success) {
                    setRoom(result.room);
                    setIsError(false);
                } else {
                    setIsError(true);
                }
            } catch (error) {
                console.error("Failed to fetch initial room state:", error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialState();

        // Setup Supabase Realtime subscription
        const channel = supabase
            .channel(`room:${code}`, {
                config: {},
            })
            .on(
                "postgres_changes",
                {
                    event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: "public",
                    table: "rooms",
                    filter: `code=eq.${code}`,
                },
                async (payload) => {
                    console.log("🏠 Room change detected:", payload);
                    // Refetch room state when any change is detected
                    await mutateRef.current?.();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "votes",
                    filter: `room_code=eq.${code}`,
                },
                async (payload: any) => {
                    console.log("🗳️ Vote change detected:", payload);
                    await mutateRef.current?.();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "participants",
                    filter: `room_code=eq.${code}`,
                },
                async (payload: any) => {
                    console.log("👥 Participant change detected:", payload);
                    await mutateRef.current?.();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "stories",
                    filter: `room_code=eq.${code}`,
                },
                async (payload: any) => {
                    console.log("📖 Story change detected:", payload);
                    await mutateRef.current?.();
                }
            )
            .subscribe((status) => {
                console.log(
                    `Realtime subscription status for room ${code}:`,
                    status
                );
                if (status === "SUBSCRIBED") {
                    console.log(
                        "✅ Successfully subscribed to realtime updates"
                    );
                } else if (status === "CHANNEL_ERROR") {
                    console.error("❌ Error subscribing to realtime channel");
                } else if (status === "TIMED_OUT") {
                    console.error("⏱️ Subscription timed out");
                } else if (status === "CLOSED") {
                    console.log("🔒 Channel closed");
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            console.log(`Unsubscribing from room ${code}`);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [code, participantId]);

    return {
        room,
        isLoading,
        isError,
        isKicked,
        mutate,
    };
}
