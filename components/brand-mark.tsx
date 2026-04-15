import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type BrandMarkProps = {
  className?: string;
  "aria-hidden"?: boolean;
};

/**
 * Shield mark — matches favicon / Arivix brand.
 */
export function BrandMark({
  className,
  "aria-hidden": ariaHidden = true,
}: BrandMarkProps) {
  return (
    <Icon
      icon="mdi:shield"
      className={cn("inline-block shrink-0 text-edge", className)}
      aria-hidden={ariaHidden}
    />
  );
}
