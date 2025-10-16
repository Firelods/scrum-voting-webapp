import type { Room, Participant, Story } from "./types"

// In-memory storage for rooms
const rooms = new Map<string, Room>()

// Generate a simple 6-character room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function createRoom(): Room {
  const code = generateRoomCode()
  const room: Room = {
    code,
    currentStory: null,
    storyQueue: [],
    participants: [],
    votingActive: false,
    votesRevealed: false,
    timerSeconds: null,
    timerStartedAt: null,
    createdAt: Date.now(),
  }
  rooms.set(code, room)
  return room
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code)
}

export function updateRoom(code: string, updates: Partial<Room>): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  const updatedRoom = { ...room, ...updates }
  rooms.set(code, updatedRoom)
  return updatedRoom
}

export function addParticipant(
  code: string,
  name: string,
  isScumMaster = false,
): { room: Room; participantId: string } | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  const participantId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const participant: Participant = {
    id: participantId,
    name,
    vote: null,
    isScumMaster,
  }

  room.participants.push(participant)
  rooms.set(code, room)

  return { room, participantId }
}

export function updateParticipantVote(code: string, participantId: string, vote: number | null): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  const participant = room.participants.find((p) => p.id === participantId)
  if (!participant) return undefined

  participant.vote = vote as any
  rooms.set(code, room)
  return room
}

export function revealVotes(code: string): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  room.votesRevealed = true
  room.votingActive = false
  rooms.set(code, room)
  return room
}

export function startVoting(code: string, story?: Story, timerSeconds?: number): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  // Reset all votes
  room.participants.forEach((p) => (p.vote = null))
  room.votingActive = true
  room.votesRevealed = false

  if (story) {
    room.currentStory = story
  }

  if (timerSeconds) {
    room.timerSeconds = timerSeconds
    room.timerStartedAt = Date.now()
  } else {
    room.timerSeconds = null
    room.timerStartedAt = null
  }

  rooms.set(code, room)
  return room
}

export function addStoryToQueue(code: string, story: Story): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  room.storyQueue.push(story)
  rooms.set(code, room)
  return room
}

export function nextStory(code: string): Room | undefined {
  const room = rooms.get(code)
  if (!room) return undefined

  // Move to next story in queue
  if (room.storyQueue.length > 0) {
    const nextStory = room.storyQueue.shift()!
    return startVoting(code, nextStory)
  }

  // No more stories, reset
  room.currentStory = null
  room.votingActive = false
  room.votesRevealed = false
  room.participants.forEach((p) => (p.vote = null))
  rooms.set(code, room)
  return room
}

// Cleanup old rooms (older than 24 hours)
setInterval(
  () => {
    const now = Date.now()
    const dayInMs = 24 * 60 * 60 * 1000

    for (const [code, room] of rooms.entries()) {
      if (now - room.createdAt > dayInMs) {
        rooms.delete(code)
      }
    }
  },
  60 * 60 * 1000,
) // Run every hour
