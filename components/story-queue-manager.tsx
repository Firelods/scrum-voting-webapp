"use client";

import { useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2, ExternalLink } from "lucide-react";
import { reorderStories, deleteStory } from "@/app/actions/room-actions";

interface Story {
    id: string;
    title: string;
    jiraLink?: string;
}

interface StoryQueueManagerProps {
    roomCode: string;
    stories: Story[];
}

function SortableStoryItem({
    story,
    onDelete,
}: {
    story: Story;
    onDelete?: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: story.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {story.title}
                    </h3>
                    {story.jiraLink && (
                        <a
                            href={story.jiraLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
            {onDelete && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(story.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            )}
        </div>
    );
}

export function StoryQueueManager({
    roomCode,
    stories: initialStories,
}: StoryQueueManagerProps) {
    const [stories, setStories] = useState(initialStories);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = stories.findIndex((s) => s.id === active.id);
            const newIndex = stories.findIndex((s) => s.id === over.id);

            const newStories = arrayMove(stories, oldIndex, newIndex);
            setStories(newStories);

            // Update order on server
            const result = await reorderStories(
                roomCode,
                newStories.map((s: Story) => s.id)
            );

            if (!result.success) {
                // Revert on error
                setStories(stories);
                alert(result.error || "Failed to reorder stories");
            }
        }
    };

    const handleDelete = async (storyId: string) => {
        if (!confirm("Are you sure you want to delete this story?")) {
            return;
        }

        const result = await deleteStory(roomCode, storyId);
        if (result.success) {
            setStories(stories.filter((s) => s.id !== storyId));
        } else {
            alert(result.error || "Failed to delete story");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Story Queue ({stories.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {stories.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No stories in queue. Add stories to get started.
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={stories.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {stories.map((story) => (
                                    <SortableStoryItem
                                        key={story.id}
                                        story={story}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardContent>
        </Card>
    );
}
