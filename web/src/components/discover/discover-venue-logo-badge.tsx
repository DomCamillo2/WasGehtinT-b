import Image from "next/image";

type Props = {
  src: string;
  /** Decorative when shown next to the venue name */
  alt?: string;
  size?: "sm" | "md";
  className?: string;
};

const px: Record<NonNullable<Props["size"]>, number> = { sm: 20, md: 24 };

export function DiscoverVenueLogoBadge({ src, alt = "", size = "sm", className }: Props) {
  const dim = px[size];
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ${className ?? ""}`}
      style={{ width: dim, height: dim }}
      aria-hidden={!alt}
    >
      <Image
        src={src}
        alt={alt}
        width={dim}
        height={dim}
        className="max-h-full max-w-full object-contain p-0.5"
        sizes={`${dim}px`}
        unoptimized
      />
    </span>
  );
}
