import type { ReactNode, SVGProps } from "react";

type IconName = "grid" | "layers" | "inbox" | "workflow" | "chart" | "settings" | "chevron" | "plus" | "arrow" | "search" | "bolt" | "check" | "clock" | "people" | "calendar" | "more" | "shield";
type Props = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></>,
  inbox: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 13h5l2 3h4l2-3h5"/></>,
  workflow: <><rect x="2" y="3" width="7" height="6" rx="1"/><rect x="15" y="15" width="7" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6M6 9v8h9"/></>,
  chart: <><path d="M4 19V5M4 19h17M8 15l4-5 3 2 5-7"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l-2 2a1.7 1.7 0 0 0-1.88-.34l-1.2.5a1.7 1.7 0 0 0-1 1.56h-2.8a1.7 1.7 0 0 0-1-1.56l-1.2-.5a1.7 1.7 0 0 0-1.88.34l-2-2A1.7 1.7 0 0 0 5.12 15l-.5-1.2A1.7 1.7 0 0 0 3.05 13H2v-2h1.05a1.7 1.7 0 0 0 1.57-1l.5-1.2a1.7 1.7 0 0 0-.34-1.88l2-2a1.7 1.7 0 0 0 1.88.34l1.2-.5a1.7 1.7 0 0 0 1-1.56h2.8a1.7 1.7 0 0 0 1 1.56l1.2.5a1.7 1.7 0 0 0 1.88-.34l2 2a1.7 1.7 0 0 0-.34 1.88l.5 1.2a1.7 1.7 0 0 0 1.56 1H22v2h-1.04a1.7 1.7 0 0 0-1.56 1l-.5 1.2Z"/></>,
  chevron: <path d="m7 10 5 5 5-5"/>, plus: <path d="M12 5v14M5 12h14"/>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-12h-7l0-8Z"/>,
  check: <path d="m4 12 5 5L20 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  shield: <><path d="m12 2 8 4v5c0 5-3.3 8.5-8 11-4.7-2.5-8-6-8-11V6l8-4Z"/><path d="m9 12 2 2 4-4"/></>,
};

export function Icon({ name, size = 20, ...props }: Props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
