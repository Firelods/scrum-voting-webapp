"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Scissors, Plus, Trash2, Loader2 } from "lucide-react";
import { splitStory, addChildStory } from "@/app/actions/room-actions";

interface Story {
    id: string;
    title: string;
    jiraLink?: string;
    finalEstimate?: number | null;
    children?: Story[];
}

interface SplitStoryDialogProps {
    roomCode: string;
    story: Story;
    onSplit?: () => void;
    triggerClassName?: string;
}

export function SplitStoryDialog({
    roomCode,
    story,
    onSplit,
    triggerClassName,
}: SplitStoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [childTitles, setChildTitles] = useState<string[]>(["", ""]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasExistingChildren = story.children && story.children.length > 0;

    const handleAddChild = () => {
        setChildTitles([...childTitles, ""]);
    };

    const handleRemoveChild = (index: number) => {
        if (childTitles.length > 1) {
            setChildTitles(childTitles.filter((_, i) => i !== index));
        }
    };

    const handleChildTitleChange = (index: number, value: string) => {
        const newTitles = [...childTitles];
        newTitles[index] = value;
        setChildTitles(newTitles);
    };

    const handleSubmit = async () => {
        // Filter out empty titles
        const validTitles = childTitles.filter((t) => t.trim() !== "");

        if (validTitles.length === 0) {
            setError("Veuillez ajouter au moins un sous-ticket");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            if (hasExistingChildren) {
                // Add children one by one to existing parent
                for (const title of validTitles) {
                    const result = await addChildStory(roomCode, story.id, title);
                    if (!result.success) {
                        setError(result.error || "Erreur lors de l'ajout du sous-ticket");
                        setIsSubmitting(false);
                        return;
                    }
                }
            } else {
                // Split the story into multiple children
                const result = await splitStory(roomCode, story.id, validTitles);
                if (!result.success) {
                    setError(result.error || "Erreur lors du découpage");
                    setIsSubmitting(false);
                    return;
                }
            }

            setOpen(false);
            setChildTitles(["", ""]);
            onSplit?.();
        } catch (err) {
            setError("Une erreur inattendue s'est produite");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen) {
            // Reset state when opening
            setChildTitles(["", ""]);
            setError(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={triggerClassName || "text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"}
                    title={hasExistingChildren ? "Ajouter des sous-tickets" : "Découper le ticket"}
                >
                    <Scissors className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {hasExistingChildren ? "Ajouter des sous-tickets" : "Découper le ticket"}
                    </DialogTitle>
                    <DialogDescription>
                        {hasExistingChildren
                            ? `Ajoutez des sous-tickets à "${story.title}"`
                            : `Découpez "${story.title}" en plusieurs sous-tickets pour les affiner séparément.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="space-y-3">
                        <Label>Sous-tickets</Label>
                        {childTitles.map((title, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder={`Sous-ticket ${index + 1}`}
                                    value={title}
                                    onChange={(e) => handleChildTitleChange(index, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && index === childTitles.length - 1) {
                                            e.preventDefault();
                                            handleAddChild();
                                        }
                                    }}
                                />
                                {childTitles.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveChild(index)}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 flex-shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleAddChild}
                        className="w-full"
                        type="button"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter un sous-ticket
                    </Button>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    {hasExistingChildren ? "Ajout..." : "Découpage..."}
                                </>
                            ) : hasExistingChildren ? (
                                "Ajouter"
                            ) : (
                                "Découper"
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                    </div>

                    {!hasExistingChildren && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Le ticket parent deviendra un conteneur et son estimation sera calculée automatiquement comme la somme des sous-tickets.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
