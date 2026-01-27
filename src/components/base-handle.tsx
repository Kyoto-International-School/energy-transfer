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
        "rounded-full border border-slate-700 bg-slate-200 transition",
        className,
      )}
    >
      {children}
    </Handle>
  );
}
