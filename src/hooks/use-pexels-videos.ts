import { useState, useCallback } from "react";

/**
 * Stock video search — stub.
 * TODO: Replace with Remotion/nana banana stock integration.
 * For now, use the Media tab to upload local videos.
 */
export function usePexelsVideos() {
  const [videos] = useState<any[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const searchVideos = useCallback(async (query: string) => {
    // No stock API — users upload local files via Media tab
  }, []);

  const loadMore = useCallback(async () => {}, []);

  return { videos, loading, error, searchVideos, loadMore };
}
