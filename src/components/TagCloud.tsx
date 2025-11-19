import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface TagCloudProps {
  tags: { tag: string; count: number }[];
  maxTags?: number;
  onTagClick?: (tag: string) => void;
}

export const TagCloud = ({ tags, maxTags = 20, onTagClick }: TagCloudProps) => {
  const displayTags = useMemo(() => {
    const sortedTags = [...tags].sort((a, b) => b.count - a.count).slice(0, maxTags);
    
    if (sortedTags.length === 0) return [];

    // Find min and max counts for scaling
    const counts = sortedTags.map(t => t.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const range = maxCount - minCount || 1;

    // Calculate sizes (from 12px to 32px)
    return sortedTags.map(tag => ({
      ...tag,
      size: 12 + ((tag.count - minCount) / range) * 20,
    }));
  }, [tags, maxTags]);

  if (displayTags.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No tags available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 items-center justify-center p-6 bg-muted/30 rounded-lg border border-border min-h-[300px]">
      {displayTags.map(({ tag, count, size }) => {
        const getFontSize = (count: number) => {
          const minSize = 0.75;
          const maxSize = 2;
          return minSize + ((count - (displayTags[displayTags.length - 1]?.count || 0)) / ((displayTags[0]?.count || 1) - (displayTags[displayTags.length - 1]?.count || 0)) || 0) * (maxSize - minSize);
        };
        
        return (
          <span
            key={tag}
            className={`inline-block px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 transition-all hover:bg-primary/20 ${
              onTagClick ? 'cursor-pointer hover:scale-110' : ''
            }`}
            style={{
              fontSize: `${getFontSize(count)}rem`,
            }}
            onClick={() => onTagClick?.(tag)}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
};
