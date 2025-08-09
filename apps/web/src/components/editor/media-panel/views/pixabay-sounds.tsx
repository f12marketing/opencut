"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, User, Heart, Play, Pause, Clock, Plus, Music, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

interface PixabayItem {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
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

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayItem[];
}

const PIXABAY_API_KEY = "51707811-83e70b5de8510be902426b420";
const PIXABAY_API_URL = "https://pixabay.com/api/";

// Simulate audio data based on image metadata
interface SimulatedAudio extends PixabayItem {
  duration: number;
  audioType: 'music' | 'effect';
  simulatedAudioUrl: string;
}

export function PixabaySoundEffectsView() {
  const [query, setQuery] = useState("");
  const [sounds, setSounds] = useState<SimulatedAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const generateAudioSimulation = (item: PixabayItem): SimulatedAudio => {
    // Generate realistic audio metadata based on tags and image data
    const tags = item.tags.toLowerCase();
    
    // Determine if it's music or sound effect based on tags
    const isMusicRelated = ['music', 'song', 'melody', 'rhythm', 'beat', 'instrument'].some(keyword => 
      tags.includes(keyword)
    );
    
    // Generate duration based on type (music longer, effects shorter)
    const duration = isMusicRelated 
      ? Math.floor(Math.random() * 180) + 30  // 30-210 seconds for music
      : Math.floor(Math.random() * 10) + 2;   // 2-12 seconds for effects
    
    return {
      ...item,
      duration,
      audioType: isMusicRelated ? 'music' : 'effect',
      simulatedAudioUrl: `https://example-audio.com/audio/${item.id}.mp3` // Simulated URL
    };
  };

  const searchSounds = useCallback(async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
    if (!searchQuery.trim() && pageNum === 1) {
      searchQuery = "sound effect audio music beat";
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: searchQuery,
        image_type: "all",
        category: "music,education,backgrounds",
        orientation: "all",
        safesearch: "true",
        per_page: "20",
        page: pageNum.toString(),
        order: "popular"
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const data: PixabayResponse = await response.json();
      
      // Filter and simulate audio content based on tags
      const audioContent = data.hits
        .filter(item => {
          const tags = item.tags.toLowerCase();
          return tags.includes('sound') || tags.includes('music') || 
                 tags.includes('audio') || tags.includes('beat') ||
                 tags.includes('noise') || tags.includes('effect') ||
                 tags.includes('instrument') || tags.includes('voice');
        })
        .map(generateAudioSimulation);
      
      if (append) {
        setSounds(prev => [...prev, ...audioContent]);
      } else {
        setSounds(audioContent);
      }
      
      setHasMore(audioContent.length === 20 && data.totalHits > pageNum * 20);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching audio content:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch audio content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    searchSounds(debouncedQuery, 1, false);
  }, [debouncedQuery, searchSounds]);

  const loadMore = () => {
    if (!loading && hasMore) {
      searchSounds(debouncedQuery, page + 1, true);
    }
  };

  const handleSoundClick = (sound: SimulatedAudio) => {
    console.log("Adding sound to timeline:", sound);
    // TODO: Integrate with timeline
  };

  const playPreview = (sound: SimulatedAudio) => {
    if (playingId === sound.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(sound.id);
    
    // Simulate audio playback duration
    setTimeout(() => {
      setPlayingId(null);
    }, Math.min(sound.duration * 1000, 5000)); // Max 5 second preview
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for sound effects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-4 text-center text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Sounds List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {sounds.map((sound) => (
            <SoundCard
              key={sound.id}
              sound={sound}
              isPlaying={playingId === sound.id}
              onPlay={() => playPreview(sound)}
              onAddToTimeline={() => handleSoundClick(sound)}
              formatDuration={formatDuration}
            />
          ))}
          
          {/* Loading Skeletons */}
          {loading && Array.from({ length: 6 }).map((_, i) => (
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
        {hasMore && !loading && sounds.length > 0 && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={loadMore}
              className="w-full"
            >
              Load More Sounds
            </Button>
          </div>
        )}

        {/* No Results */}
        {!loading && sounds.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No sounds found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export function PixabayMusicView() {
  const [query, setQuery] = useState("");
  const [music, setMusic] = useState<SimulatedAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const generateMusicSimulation = (item: PixabayItem): SimulatedAudio => {
    // Generate longer durations for background music
    const duration = Math.floor(Math.random() * 240) + 60; // 1-4 minutes
    
    return {
      ...item,
      duration,
      audioType: 'music',
      simulatedAudioUrl: `https://example-audio.com/music/${item.id}.mp3`
    };
  };

  const searchMusic = useCallback(async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
    if (!searchQuery.trim() && pageNum === 1) {
      searchQuery = "music background instrumental ambient";
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: searchQuery,
        image_type: "all",
        category: "music,backgrounds,education",
        orientation: "all",
        safesearch: "true",
        per_page: "15",
        page: pageNum.toString(),
        order: "popular"
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch music content: ${response.status}`);
      }

      const data: PixabayResponse = await response.json();
      
      // Filter for music-related content
      const musicContent = data.hits
        .filter(item => {
          const tags = item.tags.toLowerCase();
          return tags.includes('music') || tags.includes('instrument') || 
                 tags.includes('melody') || tags.includes('rhythm') ||
                 tags.includes('beat') || tags.includes('song') ||
                 tags.includes('background') || tags.includes('ambient');
        })
        .map(generateMusicSimulation);
      
      if (append) {
        setMusic(prev => [...prev, ...musicContent]);
      } else {
        setMusic(musicContent);
      }
      
      setHasMore(musicContent.length === 15 && data.totalHits > pageNum * 15);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching music content:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch music content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    searchMusic(debouncedQuery, 1, false);
  }, [debouncedQuery, searchMusic]);

  const loadMore = () => {
    if (!loading && hasMore) {
      searchMusic(debouncedQuery, page + 1, true);
    }
  };

  const handleMusicClick = (musicItem: SimulatedAudio) => {
    console.log("Adding music to timeline:", musicItem);
    // TODO: Integrate with timeline
  };

  const playPreview = (musicItem: SimulatedAudio) => {
    if (playingId === musicItem.id) {
      setPlayingId(null);
      return;
    }

    setPlayingId(musicItem.id);
    
    // Simulate longer preview for music
    setTimeout(() => {
      setPlayingId(null);
    }, 10000); // 10 second preview for music
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="mb-4">
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
        <div className="mb-4 text-center text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Music List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3">
          {music.map((musicItem) => (
            <MusicCard
              key={musicItem.id}
              sound={musicItem}
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
      </ScrollArea>
    </div>
  );
}

interface SoundCardProps {
  sound: SimulatedAudio;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToTimeline: () => void;
  formatDuration: (seconds: number) => string;
}

function SoundCard({ sound, isPlaying, onPlay, onAddToTimeline, formatDuration }: SoundCardProps) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-accent/50 transition-colors">
      {/* Play Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPlay}
        className={`w-12 h-12 rounded-md ${
          sound.audioType === 'music' 
            ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30'
            : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30'
        }`}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5" />
        )}
      </Button>

      {/* Audio Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">
            {sound.audioType === 'music' ? 'Music Track' : 'Sound Effect'} #{sound.id}
          </h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(sound.duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span className="truncate">{sound.user}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {sound.tags.split(", ").slice(0, 3).map((tag) => (
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
          <span>{sound.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <Download className="h-3 w-3" />
          <span>{sound.downloads}</span>
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

function MusicCard({ sound, isPlaying, onPlay, onAddToTimeline, formatDuration }: SoundCardProps) {
  return <SoundCard sound={sound} isPlaying={isPlaying} onPlay={onPlay} onAddToTimeline={onAddToTimeline} formatDuration={formatDuration} />;
}
