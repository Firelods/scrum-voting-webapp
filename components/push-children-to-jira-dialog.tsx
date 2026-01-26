"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Upload, CheckCircle, XCircle, CloudUpload, ExternalLink } from "lucide-react";
import { useJiraBridge } from "@/lib/hooks/use-jira-bridge";
import { extractJiraKeyFromText, buildJiraUrl } from "@/lib/jira-bridge";
import { updateChildStoryJira } from "@/app/actions/room-actions";

interface Story {
    id: string;
    title: string;
    jiraLink?: string;
    jiraKey?: string;
    finalEstimate?: number | null;
    children?: Story[];
}

interface PushChildrenToJiraDialogProps {
    roomCode: string;
    parentStory: Story;
    jiraBaseUrl?: string | null;
    onComplete?: () => void;
}

interface ChildStatus {
    id: string;
    title: string;
    status: "pending" | "creating" | "success" | "error" | "skipped";
    jiraKey?: string;
    error?: string;
}

export function PushChildrenToJiraDialog({
    roomCode,
    parentStory,
    jiraBaseUrl,
    onComplete,
}: PushChildrenToJiraDialogProps) {
    const [open, setOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [childStatuses, setChildStatuses] = useState<ChildStatus[]>([]);

    const { isConnected, createSubtasks } = useJiraBridge();

    const parentJiraKey = extractJiraKeyFromText(parentStory.jiraLink || parentStory.title);
    const hasChildren = parentStory.children && parentStory.children.length > 0;

    // Extraire le project key du parent key (ex: PROJ-123 -> PROJ)
    const projectKey = parentJiraKey?.split("-")[0];

    // Compter les enfants qui n'ont pas encore de lien Jira
    const childrenWithoutJira = parentStory.children?.filter(
        (c) => !c.jiraLink && !c.jiraKey
    ) || [];

    // Initialize child statuses when dialog opens
    useEffect(() => {
        if (open && parentStory.children) {
            setChildStatuses(
                parentStory.children.map((child) => ({
                    id: child.id,
                    title: child.title,
                    status: child.jiraLink || child.jiraKey ? "skipped" : "pending",
                    jiraKey: extractJiraKeyFromText(child.jiraLink || child.jiraKey || "") || undefined,
                }))
            );
        }
    }, [open, parentStory.children]);

    const handleCreateSubtasks = async () => {
        if (!parentJiraKey || !projectKey || !parentStory.children) {
            return;
        }

        setIsCreating(true);

        // Filter children that need to be created
        const childrenToCreate = parentStory.children.filter(
            (c) => !c.jiraLink && !c.jiraKey
        );

        if (childrenToCreate.length === 0) {
            setIsCreating(false);
            return;
        }

        // Update statuses to "creating"
        setChildStatuses((prev) =>
            prev.map((s) =>
                childrenToCreate.some((c) => c.id === s.id)
                    ? { ...s, status: "creating" }
                    : s
            )
        );

        try {
            const subtasksToCreate = childrenToCreate.map((c) => ({
                summary: c.title,
            }));

            const result = await createSubtasks(parentJiraKey, subtasksToCreate, projectKey);

            if (result.results) {
                // Update statuses based on results
                const newStatuses: ChildStatus[] = [];

                for (let i = 0; i < childrenToCreate.length; i++) {
                    const child = childrenToCreate[i];
                    const jiraResult = result.results[i];

                    if (jiraResult?.success && jiraResult.key) {
                        // Success - update the story in the database with the Jira link
                        const jiraLink = jiraBaseUrl
                            ? buildJiraUrl(jiraBaseUrl, jiraResult.key)
                            : undefined;

                        await updateChildStoryJira(
                            roomCode,
                            child.id,
                            jiraLink || "",
                            jiraResult.key
                        );

                        newStatuses.push({
                            id: child.id,
                            title: child.title,
                            status: "success",
                            jiraKey: jiraResult.key,
                        });
                    } else {
                        newStatuses.push({
                            id: child.id,
                            title: child.title,
                            status: "error",
                            error: jiraResult?.error || "Erreur inconnue",
                        });
                    }
                }

                setChildStatuses((prev) =>
                    prev.map((s) => {
                        const updated = newStatuses.find((n) => n.id === s.id);
                        return updated || s;
                    })
                );
            }
        } catch (error) {
            // Mark all as error
            setChildStatuses((prev) =>
                prev.map((s) =>
                    s.status === "creating"
                        ? {
                              ...s,
                              status: "error",
                              error: error instanceof Error ? error.message : "Erreur inconnue",
                          }
                        : s
                )
            );
        } finally {
            setIsCreating(false);
            onComplete?.();
        }
    };

    const successCount = childStatuses.filter((s) => s.status === "success").length;
    const errorCount = childStatuses.filter((s) => s.status === "error").length;
    const allDone = childStatuses.every((s) => s.status === "success" || s.status === "error" || s.status === "skipped");

    // Don't show button if:
    // - No Jira connection
    // - Parent has no Jira key
    // - No children
    // - All children already have Jira links
    if (!isConnected || !parentJiraKey || !hasChildren || childrenWithoutJira.length === 0) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950"
                    title="Créer les sous-tâches dans Jira"
                >
                    <CloudUpload className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Créer les sous-tâches dans Jira</DialogTitle>
                    <DialogDescription>
                        Créer {childrenWithoutJira.length} sous-tâche(s) sous {parentJiraKey} dans Jira.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* List of children with their status */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {childStatuses.map((child) => (
                            <div
                                key={child.id}
                                className={`flex items-center justify-between p-2 rounded border ${
                                    child.status === "success"
                                        ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                                        : child.status === "error"
                                        ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
                                        : child.status === "skipped"
                                        ? "bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                                        : "bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700"
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{child.title}</p>
                                    {child.jiraKey && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Badge variant="outline" className="text-xs">
                                                {child.jiraKey}
                                            </Badge>
                                            {jiraBaseUrl && (
                                                <a
                                                    href={buildJiraUrl(jiraBaseUrl, child.jiraKey)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-700"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                    {child.error && (
                                        <p className="text-xs text-red-600 mt-1">{child.error}</p>
                                    )}
                                </div>
                                <div className="ml-2">
                                    {child.status === "creating" && (
                                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    )}
                                    {child.status === "success" && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                    {child.status === "error" && (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    {child.status === "skipped" && (
                                        <Badge variant="secondary" className="text-xs">
                                            Déjà lié
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    {allDone && (successCount > 0 || errorCount > 0) && (
                        <div className="text-sm text-center">
                            {successCount > 0 && (
                                <span className="text-green-600">{successCount} créé(s)</span>
                            )}
                            {successCount > 0 && errorCount > 0 && " - "}
                            {errorCount > 0 && (
                                <span className="text-red-600">{errorCount} erreur(s)</span>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {!allDone && (
                            <Button
                                onClick={handleCreateSubtasks}
                                disabled={isCreating || childrenWithoutJira.length === 0}
                                className="flex-1"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Création...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Créer {childrenWithoutJira.length} sous-tâche(s)
                                    </>
                                )}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className={allDone ? "flex-1" : ""}
                        >
                            {allDone ? "Fermer" : "Annuler"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
