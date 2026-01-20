
"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { FormControl } from "@/components/ui/form";

const regions = [
  "Newcastle-under-Lyme",
  "Stafford",
  "Tamworth",
  "Stoke-on-Trent",
  "Burton upon Trent",
  "Lichfield",
  "Cannock",
  "Leek",
  "Stone",
  "Online",
];

interface RegionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RegionAutocomplete({ value, onChange, placeholder = "Select region..." }: RegionAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              !value && "text-muted-foreground"
            )}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput 
            placeholder="Search or type new region..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
                <div className="p-2 text-sm text-muted-foreground">
                    No matching region found.
                    <button 
                        className="ml-1 text-primary hover:underline"
                        onClick={() => {
                            // Normalise title case for free entry
                            const normalized = inputValue.trim().replace(/\b\w/g, l => l.toUpperCase());
                            onChange(normalized);
                            setOpen(false);
                        }}
                    >
                        Use "{inputValue}"
                    </button>
                </div>
            </CommandEmpty>
            <CommandGroup heading="Suggestions">
              {regions.map((region) => (
                <CommandItem
                  key={region}
                  value={region}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === region ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {region}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
