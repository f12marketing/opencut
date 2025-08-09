"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, User, Heart, Play, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import Image from "next/image";

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: {
    large: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    medium: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    small: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    tiny: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  views: number;
  downloads: number;
  likes: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabayVideoResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

const PIXABAY_API_KEY = "51707811-83e70b5de8510be902426b420";
const PIXABAY_VIDEO_API_URL = "https://pixabay.com/api/videos/";

export function VideosView() {
  const [query, setQuery] = useState("");
  const [videos, setVideos] = useState<PixabayVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const searchVideos = useCallback(async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
    if (!searchQuery.trim() && pageNum === 1) {
      // Load default popular videos
      searchQuery = "nature";
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: searchQuery,
        video_type: "all",
        category: "backgrounds,fashion,nature,science,education,sports,travel,computer,animals,industry,business,health,people,places",
        min_width: "1280",
        min_height: "720",
        safesearch: "true",
        per_page: "12",
        page: pageNum.toString(),
        order: "popular"
      });

      const response = await fetch(`${PIXABAY_VIDEO_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.status}`);
      }

      const data: PixabayVideoResponse = await response.json();
      
      if (append) {
        setVideos(prev => [...prev, ...data.hits]);
      } else {
        setVideos(data.hits);
      }
      
      setHasMore(data.hits.length === 12 && data.totalHits > pageNum * 12);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and search query changes
  useEffect(() => {
    setPage(1);
    searchVideos(debouncedQuery, 1, false);
  }, [debouncedQuery, searchVideos]);

  const loadMore = () => {
    if (!loading && hasMore) {
      searchVideos(debouncedQuery, page + 1, true);
    }
  };

  const handleVideoClick = (video: PixabayVideo) => {
    // TODO: Add video to timeline
    console.log("Adding video to timeline:", video);
    // This would integrate with the editor store to add the video as a media element
  };

  const handleDownloadVideo = async (video: PixabayVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.href = video.videos.large.url;
      link.download = `pixabay-video-${video.id}.mp4`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading video:", error);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for videos..."
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

      {/* Videos Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onClick={() => handleVideoClick(video)}
                onDownload={(e) => handleDownloadVideo(video, e)}
                formatDuration={formatDuration}
                formatFileSize={formatFileSize}
              />
            ))}
            
            {/* Loading Skeletons */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="space-y-2">
                <Skeleton className="w-full aspect-video rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && !loading && videos.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                className="w-full"
              >
                Load More Videos
              </Button>
            </div>
          )}

          {/* No Results */}
          {!loading && videos.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No videos found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface VideoCardProps {
  video: PixabayVideo;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
  formatDuration: (seconds: number) => string;
  formatFileSize: (bytes: number) => string;
}

function VideoCard({ video, onClick, onDownload, formatDuration, formatFileSize }: VideoCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  useEffect(() => {
    // Generate thumbnail URL from video URL
    // Pixabay videos don't provide direct thumbnails, so we'll use a placeholder approach
    // In a real implementation, you might want to use a video thumbnail service
    const videoUrl = video.videos.small.url;
    setThumbnailUrl(`https://i.vimeocdn.com/video/default_300x225.jpg`);
  }, [video]);

  return (
    <div
      className="group relative bg-card rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
      onClick={onClick}
    >
      {/* Video Preview */}
      <div className="relative aspect-video bg-muted">
        {/* Placeholder thumbnail */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
          <Play className="h-8 w-8 text-white/80" />
        </div>
        
        {/* Video Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(video.duration)}
          </div>
          <div className="bg-black/70 text-white text-xs px-2 py-1 rounded">
            {video.videos.medium.width}x{video.videos.medium.height}
          </div>
        </div>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={onDownload}
            className="mx-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span className="truncate">{video.user}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{video.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span>{video.downloads}</span>
            </div>
          </div>
          <div className="text-xs">
            {formatFileSize(video.videos.medium.size)}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {video.tags.split(", ").slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs py-0 px-1.5">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
