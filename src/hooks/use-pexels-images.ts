import { useState, useCallback } from "react";

/**
 * Stock image search — stub.
 * TODO: Replace with Remotion/nana banana stock integration.
 * For now, use the Media tab to upload local images.
 */
export function usePexelsImages() {
  const [images] = useState<any[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const searchImages = useCallback(async (query: string) => {
    // No stock API — users upload local files via Media tab
  }, []);

  const loadMore = useCallback(async () => {}, []);

  return { images, loading, error, searchImages, loadMore };
}
