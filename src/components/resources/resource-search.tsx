
"use client";

import * as React from "react";
import { Search, FileText, Folder, Video, Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ResourceItem {
  id: string;
  title: string;
  type: string;
  itemType: 'file' | 'directory';
  description?: string;
  tags?: string[];
}

interface ResourceSearchProps {
  items: ResourceItem[];
}

export function ResourceSearch({ items }: ResourceSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  // Debounce effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredItems = React.useMemo(() => {
    if (!debouncedQuery) return [];
    const lowerQuery = debouncedQuery.toLowerCase();
    return items.filter((item) => 
      item.title.toLowerCase().includes(lowerQuery) || 
      item.description?.toLowerCase().includes(lowerQuery) ||
      item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    ).slice(0, 10); // Limit to top 10
  }, [items, debouncedQuery]);

  const handleSelect = (id: string, type: string) => {
    setOpen(false);
    if (type === 'directory') {
        router.push(`/resources/${id}`);
    } else {
        router.push(`/resources/file/${id}`);
    }
  };

  return (
    <div className="w-full max-w-sm relative">
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Search resources..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (e.target.value.length > 0) setOpen(true);
                        }}
                        onFocus={() => {
                            if (query.length > 0) setOpen(true);
                        }}
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <Command>
                    <CommandList>
                        {filteredItems.length === 0 ? (
                            <CommandEmpty>No results found.</CommandEmpty>
                        ) : (
                            <CommandGroup heading="Results">
                                {filteredItems.map((item) => (
                                    <CommandItem key={item.id} onSelect={() => handleSelect(item.id, item.itemType)}>
                                        {item.itemType === 'directory' ? <Folder className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="truncate font-medium">{item.title}</span>
                                            <div className="flex gap-1 overflow-hidden">
                                                {item.tags?.slice(0, 2).map(tag => (
                                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1 h-4">{tag}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    </div>
  );
}
