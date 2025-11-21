"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GripVertical, Trash2, ExternalLink, Edit, Filter, Play } from "lucide-react";
import { reorderStories, deleteStory, updateStory, setCurrentStory } from "@/app/actions/room-actions";

interface Story {
    id: string;
    title: string;
    jiraLink?: string;
    finalEstimate?: number | null;
    votedAt?: string | null;
}

interface StoryQueueManagerProps {
    roomCode: string;
    stories: Story[];
    currentStoryId?: string | null;
}

function SortableStoryItem({
    story,
    onDelete,
    onEdit,
    onSetCurrent,
    isCurrent,
}: {
    story: Story;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, title: string, jiraLink?: string) => void;
    onSetCurrent?: (id: string) => void;
    isCurrent?: boolean;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(story.title);
    const [editJiraLink, setEditJiraLink] = useState(story.jiraLink || "");

    const handleEdit = () => {
        if (onEdit) {
            onEdit(story.id, editTitle, editJiraLink || undefined);
            setIsEditing(false);
        }
    };
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
            className={`flex items-center gap-3 p-3 rounded-lg border shadow-sm ${
                isCurrent
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-500 dark:border-blue-500"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            }`}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing"
            >
                <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    {isCurrent && (
                        <Badge className="bg-blue-600 dark:bg-blue-600 flex-shrink-0">
                            Current
                        </Badge>
                    )}
                    {story.finalEstimate !== null && story.finalEstimate !== undefined && (
                        <Badge variant="secondary" className="font-bold flex-shrink-0">
                            {story.finalEstimate} pts
                        </Badge>
                    )}
                    {story.jiraLink && (
                        <a
                            href={story.jiraLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white break-words" title={story.title}>
                    {story.title}
                </h3>
            </div>
            <div className="flex items-center gap-1">
                {onSetCurrent && !isCurrent && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetCurrent(story.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        title="Set as current story"
                    >
                        <Play className="w-4 h-4" />
                    </Button>
                )}
                {onEdit && (
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                            >
                                <Edit className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Story</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="editTitle">Story Title</Label>
                                    <Input
                                        id="editTitle"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="editJiraLink">Jira Link (optional)</Label>
                                    <Input
                                        id="editJiraLink"
                                        type="url"
                                        value={editJiraLink}
                                        onChange={(e) => setEditJiraLink(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleEdit} className="flex-1">
                                        Save Changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
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
        </div>
    );
}

export function StoryQueueManager({
    roomCode,
    stories: initialStories,
    currentStoryId,
}: StoryQueueManagerProps) {
    const [stories, setStories] = useState(initialStories);
    const [showOnlyUnestimated, setShowOnlyUnestimated] = useState(false);

    // Update stories when initialStories changes
    useEffect(() => {
        setStories(initialStories);
    }, [initialStories]);

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

    const handleEdit = async (storyId: string, title: string, jiraLink?: string) => {
        const result = await updateStory(roomCode, storyId, title, jiraLink);
        if (result.success) {
            setStories(
                stories.map((s) =>
                    s.id === storyId ? { ...s, title, jiraLink } : s
                )
            );
        } else {
            alert(result.error || "Failed to update story");
        }
    };

    const handleSetCurrent = async (storyId: string) => {
        const result = await setCurrentStory(roomCode, storyId);
        if (!result.success) {
            alert(result.error || "Failed to set current story");
        }
        // Note: The UI will update via realtime subscription
    };

    // Filter stories based on the toggle
    const filteredStories = showOnlyUnestimated
        ? stories.filter((s) => s.finalEstimate === null || s.finalEstimate === undefined)
        : stories;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Story Queue ({filteredStories.length}/{stories.length})</CardTitle>
                    <Button
                        variant={showOnlyUnestimated ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowOnlyUnestimated(!showOnlyUnestimated)}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        {showOnlyUnestimated ? "Show All" : "Only Unestimated"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {filteredStories.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        {showOnlyUnestimated
                            ? "No unestimated stories. All stories have estimates!"
                            : "No stories in queue. Add stories to get started."}
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={filteredStories.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {filteredStories.map((story) => (
                                    <SortableStoryItem
                                        key={story.id}
                                        story={story}
                                        onDelete={handleDelete}
                                        onEdit={handleEdit}
                                        onSetCurrent={handleSetCurrent}
                                        isCurrent={story.id === currentStoryId}
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
