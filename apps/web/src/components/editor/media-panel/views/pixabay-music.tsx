"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, User, Heart, Play, Pause, Clock, Plus, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

interface PixabayMusic {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  views: number;
  downloads: number;
  likes: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayMusicResponse {
  total: number;
  totalHits: number;
  hits: PixabayMusic[];
}

const PIXABAY_API_KEY = "51707811-83e70b5de8510be902426b420";
const PIXABAY_MUSIC_API_URL = "https://pixabay.com/api/";

export function PixabayMusicView() {
  const [query, setQuery] = useState("");
  const [music, setMusic] = useState<PixabayMusic[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const searchMusic = useCallback(async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
    if (!searchQuery.trim() && pageNum === 1) {
      // Load default popular music
      searchQuery = "background music";
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: searchQuery + " music",
        image_type: "all",
        category: "music",
        orientation: "all",
        safesearch: "true",
        per_page: "15",
        page: pageNum.toString(),
        order: "popular",
        // Filter for music-related content
        min_width: "150",
        min_height: "150"
      });

      const response = await fetch(`${PIXABAY_MUSIC_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch music: ${response.status}`);
      }

      const data: PixabayMusicResponse = await response.json();
      
      // Filter for music-related tags
      const musicContent = data.hits.filter(item => 
        item.tags.toLowerCase().includes('music') ||
        item.tags.toLowerCase().includes('sound') ||
        item.tags.toLowerCase().includes('audio') ||
        item.tags.toLowerCase().includes('song') ||
        item.tags.toLowerCase().includes('melody') ||
        item.tags.toLowerCase().includes('rhythm')
      );
      
      if (append) {
        setMusic(prev => [...prev, ...musicContent]);
      } else {
        setMusic(musicContent);
      }
      
      setHasMore(musicContent.length === 15 && data.totalHits > pageNum * 15);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching music:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch music");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and search query changes
  useEffect(() => {
    setPage(1);
    searchMusic(debouncedQuery, 1, false);
  }, [debouncedQuery, searchMusic]);

  const loadMore = () => {
    if (!loading && hasMore) {
      searchMusic(debouncedQuery, page + 1, true);
    }
  };

  const handleMusicClick = (musicItem: PixabayMusic) => {
    // TODO: Add music to timeline
    console.log("Adding music to timeline:", musicItem);
    // This would integrate with the editor store to add the music as an audio element
  };

  // Create a simulated audio preview (since Pixabay images don't have audio)
  const playPreview = (musicItem: PixabayMusic) => {
    if (playingId === musicItem.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    // Stop previous audio
    audioElement?.pause();

    // For demo purposes, we'll show the playing state without actual audio
    // In a real implementation, you would need actual audio URLs
    setPlayingId(musicItem.id);
    
    // Simulate audio duration
    setTimeout(() => {
      setPlayingId(null);
    }, 3000); // 3 second preview
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for background music..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 text-center text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Music List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="space-y-3">
            {music.map((musicItem) => (
              <MusicCard
                key={musicItem.id}
                musicItem={musicItem}
                isPlaying={playingId === musicItem.id}
                onPlay={() => playPreview(musicItem)}
                onAddToTimeline={() => handleMusicClick(musicItem)}
                formatDuration={formatDuration}
              />
            ))}
            
            {/* Loading Skeletons */}
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="flex items-center gap-3 p-3 bg-card rounded-lg">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && !loading && music.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                className="w-full"
              >
                Load More Music
              </Button>
            </div>
          )}

          {/* No Results */}
          {!loading && music.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No music found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MusicCardProps {
  musicItem: PixabayMusic;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToTimeline: () => void;
  formatDuration: (seconds: number) => string;
}

function MusicCard({ musicItem, isPlaying, onPlay, onAddToTimeline, formatDuration }: MusicCardProps) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-accent/50 transition-colors">
      {/* Play Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlay}
        className="w-12 h-12 rounded-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30"
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Button>

      {/* Music Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">
            Music Track {musicItem.id}
          </h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>3:00</span> {/* Simulated duration */}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{musicItem.user}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {musicItem.tags.split(", ").slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Stats and Actions */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          <span>{musicItem.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          <span>{musicItem.downloads}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddToTimeline}
          className="h-8 w-8"
          title="Add to timeline"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-500"
          title="Save to favorites"
        >
          <Heart className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
