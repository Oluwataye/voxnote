import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface TagCloudProps {
  tags: { tag: string; count: number }[];
  maxTags?: number;
}

export const TagCloud = ({ tags, maxTags = 20 }: TagCloudProps) => {
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
      {displayTags.map(({ tag, count, size }) => (
        <Badge
          key={tag}
          variant="secondary"
          className="transition-all hover:scale-110 cursor-default"
          style={{
            fontSize: `${size}px`,
            padding: `${size / 3}px ${size / 2}px`,
          }}
        >
          {tag} ({count})
        </Badge>
      ))}
    </div>
  );
};
