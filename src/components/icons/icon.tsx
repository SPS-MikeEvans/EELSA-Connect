import Image from "next/image";
import { cn } from "@/lib/utils";

export function Icon({ className, src, alt, ...props }: React.ComponentProps<typeof Image>) {
  return (
    <div className={cn("relative size-16", className)}>
      <Image 
        src={src || "/EEConnect_Logo.png"}
        alt={alt || "Summit Psychology Services Logo"}
        fill
        className="object-contain"
        {...props}
      />
    </div>
  );
}
