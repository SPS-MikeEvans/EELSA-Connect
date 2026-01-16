
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, src, alt, ...props }: React.ComponentProps<typeof Image>) {
  return (
    <Image 
      src={src || "/logo_hz.png"}
      alt={alt || "Summit Psychology Services Logo"}
      width={160}
      height={40}
      className={cn("h-10 w-auto", className)}
      priority
      {...props}
    />
  );
}
