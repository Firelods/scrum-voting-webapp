"use client";

import { useState, useEffect, useCallback } from "react";
import {
  JiraBridge,
  isExtensionInstalled,
  waitForExtension,
  extractJiraKeyFromText,
  type JiraConnectionStatus,
} from "@/lib/jira-bridge";

export interface UseJiraBridgeReturn {
  isInstalled: boolean;
  isConnected: boolean;
  isLoading: boolean;
  user: JiraConnectionStatus["user"] | null;
  error: string | null;
  checkConnection: () => Promise<void>;
  uploadStoryPoints: (
    jiraKeyOrUrl: string,
    storyPoints: number
  ) => Promise<{ success: boolean; error?: string }>;
  uploadMultipleStoryPoints: (
    stories: Array<{ jiraKey: string; storyPoints: number }>
  ) => Promise<{
    success: number;
    failed: number;
    errors: Array<{ jiraKey: string; error: string }>;
  }>;
}

export function useJiraBridge(): UseJiraBridgeReturn {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<JiraConnectionStatus["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Attendre que l'extension soit prête
      const installed = await waitForExtension(2000);
      setIsInstalled(installed);

      if (!installed) {
        setIsConnected(false);
        setUser(null);
        setError("Extension Jira Bridge non installée");
        return;
      }

      // Vérifier la connexion
      const status = await JiraBridge.checkConnection();
      setIsConnected(status.connected);
      setUser(status.user || null);

      if (!status.connected) {
        setError(status.error || "Non connecté à Jira");
      }
    } catch (err) {
      setIsConnected(false);
      setUser(null);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Vérifier la connexion au montage
  useEffect(() => {
    checkConnection();

    // Écouter l'événement de l'extension qui devient prête
    const handleReady = () => {
      checkConnection();
    };

    window.addEventListener("jira-bridge-ready", handleReady);
    return () => {
      window.removeEventListener("jira-bridge-ready", handleReady);
    };
  }, [checkConnection]);

  const uploadStoryPoints = useCallback(
    async (
      jiraKeyOrUrl: string,
      storyPoints: number
    ): Promise<{ success: boolean; error?: string }> => {
      if (!isInstalled) {
        return { success: false, error: "Extension non installée" };
      }

      if (!isConnected) {
        return { success: false, error: "Non connecté à Jira" };
      }

      try {
        // Extraire la clé Jira si c'est une URL ou un texte
        const jiraKey = extractJiraKeyFromText(jiraKeyOrUrl);

        if (!jiraKey) {
          return {
            success: false,
            error: `Impossible d'extraire la clé Jira de: ${jiraKeyOrUrl}`,
          };
        }

        const result = await JiraBridge.updateStoryPoints(jiraKey, storyPoints);
        return { success: result.success };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        };
      }
    },
    [isInstalled, isConnected]
  );

  const uploadMultipleStoryPoints = useCallback(
    async (
      stories: Array<{ jiraKey: string; storyPoints: number }>
    ): Promise<{
      success: number;
      failed: number;
      errors: Array<{ jiraKey: string; error: string }>;
    }> => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ jiraKey: string; error: string }>,
      };

      for (const story of stories) {
        const result = await uploadStoryPoints(story.jiraKey, story.storyPoints);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push({
            jiraKey: story.jiraKey,
            error: result.error || "Unknown error",
          });
        }
      }

      return results;
    },
    [uploadStoryPoints]
  );

  return {
    isInstalled,
    isConnected,
    isLoading,
    user,
    error,
    checkConnection,
    uploadStoryPoints,
    uploadMultipleStoryPoints,
  };
}
