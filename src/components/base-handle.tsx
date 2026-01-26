import type { ComponentProps } from "react";
import { Handle } from "@xyflow/react";

import { cn } from "@/lib/utils";

export function BaseHandle({
  className,
  style,
  children,
  ...props
}: ComponentProps<typeof Handle>) {
  return (
    <Handle
      {...props}
      style={{ width: 12, height: 12, ...style }}
      className={cn(
        "dark:border-secondary dark:bg-secondary rounded-full border border-slate-300 bg-slate-100 transition",
        className,
      )}
    >
      {children}
    </Handle>
  );
}
