import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

export function BrandMark({
  size = 44,
  className,
  priority = false,
}: BrandMarkProps) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/percy-mark-1024.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority={priority}
      />
    </span>
  );
}
