
import Image from "next/image";
import { cn } from "@/lib/utils";

// The props are extended from a div now, so we can pass div props to the container
export function Logo({ className, src, alt, ...props }: React.HTMLAttributes<HTMLDivElement> & { src?: string; alt?: string }) {
  return (
    <div className={cn("relative h-10 w-40", className)} {...props}>
      <Image 
        src={src || "/EEConnect_Logo.png"} // Corrected path to the actual logo
        alt={alt || "EEConnect Logo"} // Corrected alt text
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
