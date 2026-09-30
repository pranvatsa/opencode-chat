import { h, type FunctionalComponent } from "vue"

type NodeSpec = [string, Record<string, string | number>]

function icon(nodes: NodeSpec[]): FunctionalComponent {
  return (_props, { attrs }) =>
    h(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: "1em",
        height: "1em",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        ...attrs,
      },
      nodes.map(([tag, nodeAttrs]) => h(tag, nodeAttrs)),
    )
}

export const XIcon = icon([["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]])
export const CheckIcon = icon([["path", { d: "M20 6 9 17l-5-5" }]])
export const ChevronDown = icon([["path", { d: "m6 9 6 6 6-6" }]])
export const ChevronRightIcon = icon([["path", { d: "m9 18 6-6-6-6" }]])
export const Menu = icon([
  ["path", { d: "M4 12h16" }],
  ["path", { d: "M4 6h16" }],
  ["path", { d: "M4 18h16" }],
])
export const MessageSquare = icon([
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }],
])
export const TriangleAlert = icon([
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }],
])
export const ArrowUp = icon([["path", { d: "m5 12 7-7 7 7" }], ["path", { d: "M12 19V5" }]])
export const Square = icon([["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }]])
export const Copy = icon([
  ["rect", { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
])
export const MoreHorizontal = icon([
  ["circle", { cx: 12, cy: 12, r: 1 }],
  ["circle", { cx: 19, cy: 12, r: 1 }],
  ["circle", { cx: 5, cy: 12, r: 1 }],
])
export const Pencil = icon([
  ["path", { d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" }],
  ["path", { d: "m15 5 4 4" }],
])
export const Trash2 = icon([
  ["path", { d: "M3 6h18" }],
  ["path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" }],
  ["path", { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }],
  ["line", { x1: 10, x2: 10, y1: 11, y2: 17 }],
  ["line", { x1: 14, x2: 14, y1: 11, y2: 17 }],
])
export const Plus = icon([["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]])
export const Search = icon([
  ["circle", { cx: 11, cy: 11, r: 8 }],
  ["path", { d: "m21 21-4.3-4.3" }],
])
