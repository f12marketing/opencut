"use client";

import { Input } from "@/components/ui/input";
import { useState, useMemo, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  PlusIcon,
  ListFilter,
  Music,
  Clock,
  User,
} from "lucide-react";
import { useSoundsStore } from "@/stores/sounds-store";
import { useSoundSearch } from "@/hooks/use-sound-search";
import type { SoundEffect } from "@/types/sounds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function BackgroundMusicView() {
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    scrollPosition,
    setScrollPosition,
    loadSavedSounds,
    isSoundSaved,
    toggleSavedSound,
    showCommercialOnly,
    toggleCommercialFilter,
  } = useSoundsStore();

  // Pre-defined music search query to get music-specific results
  const musicQuery = searchQuery || "background music loop ambient instrumental";
  
  const {
    results: searchResults,
    isLoading: isSearching,
    loadMore,
    hasNextPage,
    isLoadingMore,
  } = useSoundSearch(musicQuery, showCommercialOnly);

  // Audio playback state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Scroll position persistence
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load saved sounds and restore scroll position when component mounts
  useEffect(() => {
    loadSavedSounds();

    if (scrollAreaRef.current && scrollPosition > 0) {
      const timeoutId = setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollPosition });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Track scroll position changes and handle infinite scroll
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    setScrollPosition(scrollTop);

    // Trigger loadMore when scrolled to within 200px of bottom
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
    if (nearBottom && hasNextPage && !isLoadingMore && !isSearching) {
      loadMore();
    }
  };

  // Filter results to focus on music and ambient sounds
  const musicResults = useMemo(() => {
    return searchResults.filter(sound => {
      const tags = sound.tags.join(' ').toLowerCase();
      const name = sound.name.toLowerCase();
      
      // Look for music-related keywords
      const musicKeywords = ['music', 'loop', 'ambient', 'background', 'instrumental', 'melody', 'rhythm', 'beat', 'track', 'composition', 'soundtrack', 'theme'];
      const hasMusic = musicKeywords.some(keyword => 
        tags.includes(keyword) || name.includes(keyword)
      );

      // Filter out short sound effects (prefer longer musical pieces)
      const isLongEnough = sound.duration > 10; // At least 10 seconds

      return hasMusic && isLongEnough;
    });
  }, [searchResults]);

  const playSound = (sound: SoundEffect) => {
    if (playingId === sound.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    // Stop previous sound
    audioElement?.pause();

    if (sound.previewUrl) {
      const audio = new Audio(sound.previewUrl);
      audio.addEventListener("ended", () => {
        setPlayingId(null);
      });
      audio.addEventListener("error", (e) => {
        setPlayingId(null);
      });
      audio.play().catch((error) => {
        setPlayingId(null);
      });

      setAudioElement(audio);
      setPlayingId(sound.id);
    }
  };

  const formatDuration = (duration: number) => {
    const min = Math.floor(duration / 60);
    const sec = Math.floor(duration % 60);
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-5 mt-1 h-full">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search background music..."
          className="bg-panel-accent w-full"
          containerClassName="w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          showClearIcon
          onClear={() => setSearchQuery("")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="text"
              size="icon"
              className={cn(showCommercialOnly && "text-primary")}
            >
              <ListFilter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={showCommercialOnly}
              onCheckedChange={toggleCommercialFilter}
            >
              Show only commercially licensed
            </DropdownMenuCheckboxItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {showCommercialOnly
                ? "Only showing music licensed for commercial use"
                : "Showing all music regardless of license"}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative h-full overflow-hidden">
        <ScrollArea
          className="flex-1 h-full"
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="flex flex-col gap-3">
            {isLoading && !searchQuery && (
              <div className="text-muted-foreground text-sm">
                Loading background music...
              </div>
            )}
            {isSearching && searchQuery && (
              <div className="text-muted-foreground text-sm">Searching...</div>
            )}
            {musicResults.map((sound) => (
              <MusicItem
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={() => playSound(sound)}
                isSaved={isSoundSaved(sound.id)}
                onToggleSaved={() => toggleSavedSound(sound)}
                formatDuration={formatDuration}
              />
            ))}
            {!isLoading && !isSearching && musicResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No background music found</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            )}
            {isLoadingMore && (
              <div className="text-muted-foreground text-sm text-center py-4">
                Loading more music...
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface MusicItemProps {
  sound: SoundEffect;
  isPlaying: boolean;
  onPlay: () => void;
  isSaved: boolean;
  onToggleSaved: () => void;
  formatDuration: (duration: number) => string;
}

function MusicItem({
  sound,
  isPlaying,
  onPlay,
  isSaved,
  onToggleSaved,
  formatDuration,
}: MusicItemProps) {
  const { addSoundToTimeline } = useSoundsStore();

  const handleClick = () => {
    onPlay();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSaved();
  };

  const handleAddToTimeline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addSoundToTimeline(sound);
  };

  return (
    <div
      className="group flex items-center gap-3 p-3 bg-card rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      {/* Play Button with Music Icon */}
      <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-md flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        {isPlaying ? (
          <PauseIcon className="w-5 h-5 text-blue-600" />
        ) : (
          <PlayIcon className="w-5 h-5 text-blue-600" />
        )}
      </div>

      {/* Music Info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">{sound.name}</h4>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(sound.duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <User className="h-3 w-3" />
          <span className="truncate">{sound.username}</span>
        </div>

        {/* Music Tags */}
        <div className="flex flex-wrap gap-1">
          {sound.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          onClick={handleAddToTimeline}
          title="Add to timeline"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`hover:text-foreground h-8 w-8 ${
            isSaved
              ? "text-red-500 hover:text-red-600"
              : "text-muted-foreground"
          }`}
          onClick={handleSaveClick}
          title={isSaved ? "Remove from saved" : "Save music"}
        >
          <HeartIcon className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
