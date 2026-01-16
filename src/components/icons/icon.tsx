import Image from "next/image";
import { cn } from "@/lib/utils";

export function Icon({ className, src, alt, ...props }: React.ComponentProps<typeof Image>) {
  return (
    <Image 
      src={src || "/logo.png"}
      alt={alt || "Summit Psychology Services Logo"}
      width={64}
      height={64}
      className={cn("size-16", className)}
      {...props}
    />
  );
}
