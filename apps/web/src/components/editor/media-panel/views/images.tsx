"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Download, User, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import Image from "next/image";

interface PixabayImage {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
  tags: string;
  user: string;
  views: number;
  downloads: number;
  likes: number;
  pageURL: string;
  webformatWidth: number;
  webformatHeight: number;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}

const PIXABAY_API_KEY = "51707811-83e70b5de8510be902426b420";
const PIXABAY_API_URL = "https://pixabay.com/api/";

export function ImagesView() {
  const [query, setQuery] = useState("");
  const [images, setImages] = useState<PixabayImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 500);

  const searchImages = useCallback(async (searchQuery: string, pageNum: number = 1, append: boolean = false) => {
    if (!searchQuery.trim() && pageNum === 1) {
      // Load default popular images
      searchQuery = "abstract background";
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        key: PIXABAY_API_KEY,
        q: searchQuery,
        image_type: "photo",
        orientation: "all",
        category: "backgrounds,computer,education,fashion,feelings,graphics,health,industry,money,nature,people,places,religion,science,sports,transportation,travel",
        min_width: "1280",
        min_height: "720",
        safesearch: "true",
        per_page: "20",
        page: pageNum.toString(),
        order: "popular"
      });

      const response = await fetch(`${PIXABAY_API_URL}?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.status}`);
      }

      const data: PixabayResponse = await response.json();
      
      if (append) {
        setImages(prev => [...prev, ...data.hits]);
      } else {
        setImages(data.hits);
      }
      
      setHasMore(data.hits.length === 20 && data.totalHits > pageNum * 20);
      setPage(pageNum);
    } catch (error) {
      console.error("Error fetching images:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch images");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and search query changes
  useEffect(() => {
    setPage(1);
    searchImages(debouncedQuery, 1, false);
  }, [debouncedQuery, searchImages]);

  const loadMore = () => {
    if (!loading && hasMore) {
      searchImages(debouncedQuery, page + 1, true);
    }
  };

  const handleImageClick = (image: PixabayImage) => {
    // TODO: Add image to timeline
    console.log("Adding image to timeline:", image);
    // This would integrate with the editor store to add the image as a media element
  };

  const handleDownloadImage = async (image: PixabayImage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement('a');
      link.href = image.largeImageURL;
      link.download = `pixabay-${image.id}.jpg`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Search Header */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search for images..."
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

      {/* Images Grid */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onClick={() => handleImageClick(image)}
                onDownload={(e) => handleDownloadImage(image, e)}
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
          {hasMore && !loading && images.length > 0 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={loadMore}
                className="w-full"
              >
                Load More Images
              </Button>
            </div>
          )}

          {/* No Results */}
          {!loading && images.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No images found</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ImageCardProps {
  image: PixabayImage;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
}

function ImageCard({ image, onClick, onDownload }: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className="group relative rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all duration-200"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-video">
        {isLoading && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        <Image
          src={image.webformatURL}
          alt={image.tags}
          fill
          className={`object-cover transition-opacity duration-200 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          sizes="(max-width: 768px) 50vw, 25vw"
        />

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
    </div>
  );
}
