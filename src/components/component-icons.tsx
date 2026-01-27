import type { IconType } from "react-icons";
import { FaBatteryFull, FaCube, FaGlobeAsia } from "react-icons/fa";

import type { EnergyNodeKind } from "../types";

const componentTypeIcons: Record<EnergyNodeKind, IconType> = {
  container: FaCube,
  store: FaBatteryFull,
  external: FaGlobeAsia,
};

type ComponentTypeIconProps = {
  kind: EnergyNodeKind;
  className?: string;
  title?: string;
};

export function ComponentTypeIcon({
  kind,
  className,
  title,
}: ComponentTypeIconProps) {
  const Icon = componentTypeIcons[kind];

  return <Icon className={className} aria-hidden={!title} title={title} />;
}
