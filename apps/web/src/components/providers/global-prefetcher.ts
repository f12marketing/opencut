"use client";

import { useEffect } from "react";
import { useSoundsStore } from "@/stores/sounds-store";

export function useGlobalPrefetcher() {
  const {
    hasLoaded,
    setTopSoundEffects,
    setLoading,
    setError,
    setHasLoaded,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
  } = useSoundsStore();

  useEffect(() => {
    if (hasLoaded) return;

    let ignore = false;

    const prefetchTopSounds = async () => {
      try {
        if (!ignore) {
          setLoading(true);
          setError(null);
        }

        const response = await fetch(
          "/api/sounds/search?page_size=50&sort=downloads"
        );

        if (!ignore) {
          const data = await response.json();

          // Handle case where API is not configured (returns empty results with error message)
          if (data.error && data.count === 0) {
            console.warn("Freesound API not configured, sounds functionality disabled");
            setTopSoundEffects([]);
            setHasLoaded(true);
            setCurrentPage(1);
            setHasNextPage(false);
            setTotalCount(0);
            return;
          }

          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          setTopSoundEffects(data.results);
          setHasLoaded(true);

          // Set pagination state for top sounds
          setCurrentPage(1);
          setHasNextPage(!!data.next);
          setTotalCount(data.count);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to prefetch top sounds:", error);
          setError(
            error instanceof Error ? error.message : "Failed to load sounds"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(prefetchTopSounds, 100);

    return () => {
      clearTimeout(timeoutId);
      ignore = true;
    };
  }, [
    hasLoaded,
    setTopSoundEffects,
    setLoading,
    setError,
    setHasLoaded,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
  ]);
}
