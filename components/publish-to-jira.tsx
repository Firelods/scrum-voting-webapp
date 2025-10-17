"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "@/components/ui/loader";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { logger } from "@/lib/logger";

interface PublishToJiraProps {
    /** The current story's Jira link (if any) */
    jiraLink?: string;
    /** Suggested vote value (e.g., mode, median) */
    suggestedPoints?: number;
}

/**
 * PublishToJira Component
 * 
 * Allows the Scrum Master to publish the team's vote result to a Jira issue.
 * 
 * How to generate a Personal Access Token (PAT) in Jira:
 * 1. Go to your Jira profile (click your avatar → Profile)
 * 2. Navigate to "Personal Access Tokens" section
 * 3. Click "Create Token"
 * 4. Give it a name (e.g., "Scrum Poker App") and set an expiration
 * 5. Copy the token immediately (you won't be able to see it again)
 * 
 * The PAT is used with Basic Auth: Authorization: Basic base64(username:PAT)
 */
export function PublishToJira({ jiraLink, suggestedPoints }: PublishToJiraProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Extract issue key from Jira link if provided
    const extractIssueKey = (link?: string): string => {
        if (!link) return "";
        const match = link.match(/([A-Z]+-\d+)/);
        return match ? match[1] : "";
    };

    // Form state
    const [formData, setFormData] = useState({
        baseUrl: process.env.NEXT_PUBLIC_JIRA_DEFAULT_BASE_URL || "https://jira.urssaf.recouv",
        issueKey: extractIssueKey(jiraLink),
        username: "",
        pat: "",
        storyPoints: suggestedPoints?.toString() || "",
        addComment: true,
        updateStoryPoints: true,
    });

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handlePublish = async () => {
        // Validation
        if (!formData.issueKey.trim()) {
            setErrorMessage("Please enter a Jira issue key (e.g., ACTRLD-6289)");
            setPublishStatus("error");
            return;
        }

        if (!formData.username.trim()) {
            setErrorMessage("Please enter your Jira username or email");
            setPublishStatus("error");
            return;
        }

        if (!formData.pat.trim()) {
            setErrorMessage("Please enter your Personal Access Token");
            setPublishStatus("error");
            return;
        }

        if (!formData.storyPoints.trim() || isNaN(Number(formData.storyPoints))) {
            setErrorMessage("Please enter a valid number for story points");
            setPublishStatus("error");
            return;
        }

        setIsPublishing(true);
        setPublishStatus("idle");
        setErrorMessage("");

        try {
            const response = await fetch("/api/jira/publish-vote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    baseUrl: formData.baseUrl,
                    issueKey: formData.issueKey,
                    username: formData.username,
                    pat: formData.pat,
                    storyPoints: Number(formData.storyPoints),
                    addComment: formData.addComment,
                    updateStoryPoints: formData.updateStoryPoints,
                }),
            });

            const result = await response.json();

            if (result.success) {
                setPublishStatus("success");
                logger.info(`Successfully published to Jira: ${formData.issueKey}`);
                
                // Clear sensitive data after success
                setFormData((prev) => ({
                    ...prev,
                    pat: "",
                }));

                // Auto-close dialog after 2 seconds
                setTimeout(() => {
                    setIsOpen(false);
                    setPublishStatus("idle");
                }, 2000);
            } else {
                setPublishStatus("error");
                setErrorMessage(result.error || "Failed to publish to Jira");
                logger.error("Jira publish error:", result.error);
            }
        } catch (error) {
            setPublishStatus("error");
            setErrorMessage("Network error. Please check your connection and try again.");
            logger.error("Failed to publish to Jira:", error);
        } finally {
            setIsPublishing(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            // Reset status when closing
            setPublishStatus("idle");
            setErrorMessage("");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Publish to Jira
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Publish Vote to Jira
                    </DialogTitle>
                    <DialogDescription>
                        Upload the decided story points to your Jira issue.
                        Your Personal Access Token is never stored and only used for this request.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Status Messages */}
                    {publishStatus === "success" && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <p className="text-sm text-green-800 dark:text-green-200">
                                Successfully published to Jira!
                            </p>
                        </div>
                    )}

                    {publishStatus === "error" && (
                        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                            <p className="text-sm text-red-800 dark:text-red-200">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {/* Story Points - Decided by Scrum Master */}
                    <div className="space-y-2">
                        <Label htmlFor="storyPoints" className="text-sm font-semibold">
                            Decided Story Points *
                        </Label>
                        <Input
                            id="storyPoints"
                            type="number"
                            min="0"
                            placeholder="e.g., 8"
                            value={formData.storyPoints}
                            onChange={(e) => handleInputChange("storyPoints", e.target.value)}
                            disabled={isPublishing}
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Enter the final number of points decided for this user story
                        </p>
                    </div>

                    {/* Jira Base URL */}
                    <div className="space-y-2">
                        <Label htmlFor="baseUrl" className="text-sm font-semibold">
                            Jira Base URL
                        </Label>
                        <Input
                            id="baseUrl"
                            type="url"
                            placeholder="https://jira.urssaf.recouv"
                            value={formData.baseUrl}
                            onChange={(e) => handleInputChange("baseUrl", e.target.value)}
                            disabled={isPublishing}
                        />
                    </div>

                    {/* Issue Key */}
                    <div className="space-y-2">
                        <Label htmlFor="issueKey" className="text-sm font-semibold">
                            Jira Issue Key *
                        </Label>
                        <Input
                            id="issueKey"
                            type="text"
                            placeholder="e.g., ACTRLD-6289"
                            value={formData.issueKey}
                            onChange={(e) => handleInputChange("issueKey", e.target.value.trim().toUpperCase())}
                            disabled={isPublishing}
                        />
                        {jiraLink && (
                            <a
                                href={jiraLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                <ExternalLink className="w-3 h-3" />
                                Open in Jira
                            </a>
                        )}
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-semibold">
                            Jira Username / Email *
                        </Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="your.email@company.com"
                            value={formData.username}
                            onChange={(e) => handleInputChange("username", e.target.value)}
                            disabled={isPublishing}
                            autoComplete="username"
                        />
                    </div>

                    {/* Personal Access Token */}
                    <div className="space-y-2">
                        <Label htmlFor="pat" className="text-sm font-semibold">
                            Personal Access Token (PAT) *
                        </Label>
                        <Input
                            id="pat"
                            type="password"
                            placeholder="Enter your Jira PAT"
                            value={formData.pat}
                            onChange={(e) => handleInputChange("pat", e.target.value)}
                            disabled={isPublishing}
                            autoComplete="off"
                        />
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Generate a PAT in Jira: Profile → Personal Access Tokens → Create Token
                        </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="addComment"
                                checked={formData.addComment}
                                onChange={(e) => handleInputChange("addComment", e.target.checked)}
                                disabled={isPublishing}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="addComment" className="text-sm cursor-pointer">
                                Add comment with vote result
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="updateStoryPoints"
                                checked={formData.updateStoryPoints}
                                onChange={(e) => handleInputChange("updateStoryPoints", e.target.checked)}
                                disabled={isPublishing}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="updateStoryPoints" className="text-sm cursor-pointer">
                                Update story points field
                            </Label>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Security:</strong> Your PAT is transmitted securely and never stored. 
                            It's only used in-memory for this single request.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        disabled={isPublishing}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={isPublishing || publishStatus === "success"}
                    >
                        {isPublishing ? (
                            <>
                                <Loader size="sm" className="mr-2" />
                                Publishing...
                            </>
                        ) : publishStatus === "success" ? (
                            <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Published!
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Publish to Jira
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
