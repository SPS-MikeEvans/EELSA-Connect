
"use client";

import * as React from "react";
import { X, Check, ChevronsUpDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { collection, getDocs, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value = [], onChange, placeholder = "Select tags..." }: TagInputProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [availableTags, setAvailableTags] = React.useState<{ id: string; name: string }[]>([]);

  // Subscribe to tags collection
  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "resourceTags"), (snapshot) => {
        const tags = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setAvailableTags(tags.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (currentValue: string) => {
    const isSelected = value.includes(currentValue);
    if (isSelected) {
      onChange(value.filter((t) => t !== currentValue));
    } else {
      onChange([...value, currentValue]);
    }
    setInputValue("");
    // Keep open for multiple selection
  };

  const handleCreateTag = async () => {
    if (!inputValue) return;
    const trimmedInput = inputValue.trim();
    
    // Check if it already exists in available tags (case insensitive)
    const existing = availableTags.find(t => t.name.toLowerCase() === trimmedInput.toLowerCase());
    
    let tagName = trimmedInput;
    if (existing) {
        tagName = existing.name;
    } else {
        // Create new tag in Firestore
        // We use the name as ID to prevent duplicates easily, or auto-id
        // Using auto-id allows renaming later, but name-as-id is simpler for unique checks.
        // Let's use auto-id but check for existence.
        try {
            await setDoc(doc(collection(db, "resourceTags")), {
                name: trimmedInput,
                createdAt: new Date(),
            });
        } catch (e) {
            console.error("Error creating tag:", e);
        }
    }

    if (!value.includes(tagName)) {
        onChange([...value, tagName]);
    }
    setInputValue("");
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(value.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              className="hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Remove {tag}</span>
            </button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
                placeholder="Search or create tag..." 
                value={inputValue}
                onValueChange={setInputValue}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputValue) {
                        e.preventDefault();
                        handleCreateTag();
                    }
                }}
            />
            <CommandList>
              <CommandEmpty className="py-2 px-4 text-sm">
                {inputValue ? (
                     <button 
                        className="flex items-center gap-2 w-full text-left text-primary hover:underline"
                        onClick={handleCreateTag}
                        type="button"
                     >
                        <Plus className="h-4 w-4" /> Create "{inputValue}"
                     </button>
                ) : "No tags found."}
              </CommandEmpty>
              <CommandGroup>
                {availableTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(tag.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
