"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getRoomState } from "@/app/actions/room-actions";
import type { Room } from "@/lib/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

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
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
                        logger.warn("⚠️ Participant has been kicked from the room");
                        setIsKicked(true);
                    }
                }
            }
        } catch (error) {
            logger.error("Failed to fetch room state:", error);
        }
    };

    // Debounced mutate to prevent cascade of calls
    const debouncedMutate = useCallback(() => {
        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new timer
        debounceTimerRef.current = setTimeout(() => {
            mutateRef.current?.();
        }, 150); // 150ms debounce
    }, []);

    // Keep mutate ref updated
    mutateRef.current = mutate;

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
                logger.error("Failed to fetch initial room state:", error);
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
                    logger.log("🏠 Room change detected:", payload);
                    // Use debounced mutate to prevent cascade of calls
                    debouncedMutate();
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
                    logger.log("🗳️ Vote change detected:", payload);
                    debouncedMutate();
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
                    logger.log("👥 Participant change detected:", payload);
                    debouncedMutate();
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
                    logger.log("📖 Story change detected:", payload);
                    debouncedMutate();
                }
            )
            .subscribe((status) => {
                logger.log(
                    `Realtime subscription status for room ${code}:`,
                    status
                );
                if (status === "SUBSCRIBED") {
                    logger.log(
                        "✅ Successfully subscribed to realtime updates"
                    );
                } else if (status === "CHANNEL_ERROR") {
                    logger.error("❌ Error subscribing to realtime channel");
                } else if (status === "TIMED_OUT") {
                    logger.error("⏱️ Subscription timed out");
                } else if (status === "CLOSED") {
                    logger.log("🔒 Channel closed");
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            logger.log(`Unsubscribing from room ${code}`);

            // Clear debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [code, participantId, debouncedMutate]);

    return {
        room,
        isLoading,
        isError,
        isKicked,
        mutate,
    };
}
