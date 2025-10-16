"use client"

import useSWR from "swr"
import { getRoomState } from "@/app/actions/room-actions"
import type { Room } from "@/lib/types"

export function useRoom(code: string | null) {
  const { data, error, mutate } = useSWR(
    code ? `room-${code}` : null,
    async () => {
      if (!code) return null
      const result = await getRoomState(code)
      if (!result.success) throw new Error(result.error)
      return result.room
    },
    {
      refreshInterval: 1000, // Poll every second for real-time updates
      revalidateOnFocus: true,
    },
  )

  return {
    room: data as Room | null | undefined,
    isLoading: !error && !data,
    isError: error,
    mutate,
  }
}
