import Image from "next/image";

type Props = {
  src: string;
  /** Decorative when shown next to the venue name */
  alt?: string;
  size?: "sm" | "md";
  className?: string;
};

const px: Record<NonNullable<Props["size"]>, number> = { sm: 24, md: 30 };

export function DiscoverVenueLogoBadge({ src, alt = "", size = "sm", className }: Props) {
  const dim = px[size];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className ?? ""}`}
      style={{ width: dim, height: dim }}
      aria-hidden={!alt}
    >
      <Image
        src={src}
        alt={alt}
        width={dim}
        height={dim}
        className="h-full w-full object-cover"
        sizes={`${dim}px`}
        unoptimized
      />
    </span>
  );
}
