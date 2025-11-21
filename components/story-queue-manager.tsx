"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { GripVertical, Trash2, ExternalLink, Edit, Filter, Play, Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { reorderStories, deleteStory, updateStory, setCurrentStory } from "@/app/actions/room-actions";
import { useJiraBridge } from "@/lib/hooks/use-jira-bridge";
import { extractJiraKeyFromText } from "@/lib/jira-bridge";

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

// État d'upload pour chaque story
type UploadStatus = "idle" | "uploading" | "success" | "error";

function SortableStoryItem({
    story,
    onDelete,
    onEdit,
    onSetCurrent,
    onUpload,
    isCurrent,
    uploadStatus,
    isJiraConnected,
    jiraStoryPoints,
}: {
    story: Story;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, title: string, jiraLink?: string) => void;
    onSetCurrent?: (id: string) => void;
    onUpload?: (story: Story) => void;
    isCurrent?: boolean;
    uploadStatus?: UploadStatus;
    isJiraConnected?: boolean;
    jiraStoryPoints?: number | null;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(story.title);
    const [editJiraLink, setEditJiraLink] = useState(story.jiraLink || "");

    // Vérifie si les SP sont synchronisés
    const isSynced = jiraStoryPoints !== null &&
        jiraStoryPoints !== undefined &&
        story.finalEstimate === jiraStoryPoints;

    // Peut uploader si: a un lien Jira, a une estimation, Jira connecté, et pas déjà synced
    const canUpload = isJiraConnected &&
        story.jiraLink &&
        story.finalEstimate !== null &&
        story.finalEstimate !== undefined &&
        extractJiraKeyFromText(story.jiraLink || story.title);

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
                    {/* Afficher les SP Jira si différents ou pour info */}
                    {isJiraConnected && jiraStoryPoints !== null && jiraStoryPoints !== undefined && (
                        <Badge
                            variant="outline"
                            className={`flex-shrink-0 ${
                                isSynced
                                    ? "border-green-500 text-green-600 dark:text-green-400"
                                    : "border-orange-500 text-orange-600 dark:text-orange-400"
                            }`}
                        >
                            Jira: {jiraStoryPoints} pts
                            {isSynced && " ✓"}
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
                {/* Upload to Jira button */}
                {onUpload && canUpload && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onUpload(story)}
                                    disabled={uploadStatus === "uploading" || isSynced}
                                    className={
                                        isSynced
                                            ? "text-green-600 cursor-default opacity-60"
                                            : uploadStatus === "success"
                                            ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                                            : uploadStatus === "error"
                                            ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                            : "text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                                    }
                                >
                                    {uploadStatus === "uploading" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isSynced || uploadStatus === "success" ? (
                                        <CheckCircle className="w-4 h-4" />
                                    ) : uploadStatus === "error" ? (
                                        <XCircle className="w-4 h-4" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isSynced
                                    ? "Déjà synchronisé avec Jira"
                                    : uploadStatus === "success"
                                    ? "Uploadé sur Jira!"
                                    : uploadStatus === "error"
                                    ? "Erreur lors de l'upload"
                                    : jiraStoryPoints !== null && jiraStoryPoints !== undefined
                                    ? `Mettre à jour ${jiraStoryPoints} → ${story.finalEstimate} pts`
                                    : `Upload ${story.finalEstimate} pts sur Jira`}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
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
    const [uploadStatuses, setUploadStatuses] = useState<Record<string, UploadStatus>>({});
    const [isUploadingAll, setIsUploadingAll] = useState(false);
    const [jiraStoryPoints, setJiraStoryPoints] = useState<Record<string, number | null>>({});
    const [isLoadingJiraSP, setIsLoadingJiraSP] = useState(false);

    // Hook Jira Bridge
    const { isConnected: isJiraConnected, uploadStoryPoints, getStoryPoints } = useJiraBridge();

    // Update stories when initialStories changes
    useEffect(() => {
        setStories(initialStories);
    }, [initialStories]);

    // Récupérer les SP Jira quand connecté
    const fetchJiraStoryPoints = useCallback(async () => {
        if (!isJiraConnected) return;

        const storiesWithJira = stories.filter(
            (s) => s.jiraLink && extractJiraKeyFromText(s.jiraLink || s.title)
        );

        if (storiesWithJira.length === 0) return;

        setIsLoadingJiraSP(true);
        const newJiraSP: Record<string, number | null> = {};

        for (const story of storiesWithJira) {
            const jiraKey = extractJiraKeyFromText(story.jiraLink || story.title);
            if (jiraKey) {
                const result = await getStoryPoints(jiraKey);
                newJiraSP[story.id] = result.storyPoints;
            }
        }

        setJiraStoryPoints(newJiraSP);
        setIsLoadingJiraSP(false);
    }, [isJiraConnected, stories, getStoryPoints]);

    // Charger les SP Jira quand la connexion change ou les stories changent
    useEffect(() => {
        fetchJiraStoryPoints();
    }, [fetchJiraStoryPoints]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Upload une story vers Jira
    const handleUpload = async (story: Story) => {
        const jiraKey = extractJiraKeyFromText(story.jiraLink || story.title);
        if (!jiraKey || story.finalEstimate === null || story.finalEstimate === undefined) {
            return;
        }

        setUploadStatuses((prev) => ({ ...prev, [story.id]: "uploading" }));

        const result = await uploadStoryPoints(jiraKey, story.finalEstimate);

        setUploadStatuses((prev) => ({
            ...prev,
            [story.id]: result.success ? "success" : "error",
        }));

        // Si succès, mettre à jour les SP Jira localement
        if (result.success) {
            setJiraStoryPoints((prev) => ({
                ...prev,
                [story.id]: story.finalEstimate!,
            }));

            // Reset status après 3 secondes pour success
            setTimeout(() => {
                setUploadStatuses((prev) => ({ ...prev, [story.id]: "idle" }));
            }, 3000);
        }
    };

    // Upload toutes les stories estimées vers Jira (non synced)
    const handleUploadAll = async () => {
        const uploadableStories = stories.filter(
            (s) =>
                s.finalEstimate !== null &&
                s.finalEstimate !== undefined &&
                extractJiraKeyFromText(s.jiraLink || s.title) &&
                jiraStoryPoints[s.id] !== s.finalEstimate // Pas déjà synced
        );

        if (uploadableStories.length === 0) {
            alert("Aucune story à uploader");
            return;
        }

        setIsUploadingAll(true);
        let successCount = 0;
        let errorCount = 0;

        for (const story of uploadableStories) {
            await handleUpload(story);
            const status = uploadStatuses[story.id];
            if (status === "success") successCount++;
            else if (status === "error") errorCount++;
        }

        setIsUploadingAll(false);

        // Afficher un résumé
        if (errorCount === 0) {
            alert(`${successCount} story points uploadés sur Jira avec succès!`);
        } else {
            alert(`Upload terminé: ${successCount} succès, ${errorCount} erreurs`);
        }
    };

    // Compter les stories uploadables (non synchronisées)
    const uploadableCount = stories.filter(
        (s) =>
            s.finalEstimate !== null &&
            s.finalEstimate !== undefined &&
            extractJiraKeyFromText(s.jiraLink || s.title) &&
            jiraStoryPoints[s.id] !== s.finalEstimate // Pas déjà synced
    ).length;

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
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle>Story Queue ({filteredStories.length}/{stories.length})</CardTitle>
                    <div className="flex items-center gap-2">
                        {/* Upload All button - visible si Jira est connecté et qu'il y a des stories uploadables */}
                        {isJiraConnected && uploadableCount > 0 && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleUploadAll}
                                            disabled={isUploadingAll}
                                            className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                                        >
                                            {isUploadingAll ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="w-4 h-4 mr-2" />
                                            )}
                                            Upload All ({uploadableCount})
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        Upload tous les story points estimés vers Jira
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <Button
                            variant={showOnlyUnestimated ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowOnlyUnestimated(!showOnlyUnestimated)}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            {showOnlyUnestimated ? "Show All" : "Only Unestimated"}
                        </Button>
                    </div>
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
                                        onUpload={handleUpload}
                                        isCurrent={story.id === currentStoryId}
                                        uploadStatus={uploadStatuses[story.id] || "idle"}
                                        isJiraConnected={isJiraConnected}
                                        jiraStoryPoints={jiraStoryPoints[story.id]}
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
