
import React from 'react';

const iconBaseProps = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "20",
  height: "20",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
};

const createSvg = (...children: React.ReactNode[]) =>
  React.createElement('svg', iconBaseProps, ...children);

export const ICONS = {
  Dashboard: () => createSvg(
    React.createElement('rect', { x: 3, y: 3, width: 7, height: 7, key: 'r1' }),
    React.createElement('rect', { x: 14, y: 3, width: 7, height: 7, key: 'r2' }),
    React.createElement('rect', { x: 14, y: 14, width: 7, height: 7, key: 'r3' }),
    React.createElement('rect', { x: 3, y: 14, width: 7, height: 7, key: 'r4' })
  ),
  Income: () => createSvg(
    React.createElement('line', { x1: 12, y1: 1, x2: 12, y2: 23, key: 'l1' }),
    React.createElement('path', { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: 'p1' })
  ),
  Expenses: () => createSvg(
    React.createElement('line', { x1: 12, y1: 1, x2: 12, y2: 23, key: 'l1' }),
    React.createElement('path', { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: 'p1' }),
    React.createElement('line', { x1: 19, y1: 5, x2: 5, y2: 19, stroke: "red", opacity: 0.5, key: 'l2' })
  ),
  Entities: () => createSvg(
    React.createElement('path', { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", key: 'p1' }),
    React.createElement('circle', { cx: 9, cy: 7, r: 4, key: 'c1' }),
    React.createElement('path', { d: "M23 21v-2a4 4 0 0 0-3-3.87", key: 'p2' }),
    React.createElement('path', { d: "M16 3.13a4 4 0 0 1 0 7.75", key: 'p3' })
  ),
  Marketing: () => createSvg(
    React.createElement('path', { d: "M12 20V10", key: 'p1' }),
    React.createElement('path', { d: "M18 20V4", key: 'p2' }),
    React.createElement('path', { d: "M6 20v-4", key: 'p3' })
  ),
  Import: () => createSvg(
    React.createElement('path', { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: 'p1' }),
    React.createElement('polyline', { points: "7 10 12 15 17 10", key: 'pl1' }),
    React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3, key: 'l1' })
  ),
  Logout: () => createSvg(
    React.createElement('path', { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: 'p1' }),
    React.createElement('polyline', { points: "16 17 21 12 16 7", key: 'pl1' }),
    React.createElement('line', { x1: 21, y1: 12, x2: 9, y2: 12, key: 'l1' })
  ),
  Plus: () => createSvg(
    React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19, key: 'l1' }),
    React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12, key: 'l2' })
  ),
  Check: () => createSvg(
    React.createElement('polyline', { points: "20 6 9 17 4 12", key: 'pl1' })
  ),
  Search: () => createSvg(
    React.createElement('circle', { cx: 11, cy: 11, r: 8, key: 'c1' }),
    React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65, key: 'l1' })
  ),
  Filter: () => createSvg(
    React.createElement('polygon', { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3", key: 'p1' })
  ),
  Edit: () => createSvg(
    React.createElement('path', { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", key: 'p1' }),
    React.createElement('path', { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", key: 'p2' })
  ),
  Trash: () => createSvg(
    React.createElement('polyline', { points: "3 6 5 6 21 6", key: 'p1' }),
    React.createElement('path', { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: 'p2' })
  ),
  Phone: () => createSvg(
    React.createElement('path', { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z", key: 'p1' })
  ),
  FileText: () => createSvg(
    React.createElement('path', { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", key: 'p1' }),
    React.createElement('polyline', { points: "14 2 14 8 20 8", key: 'p2' }),
    React.createElement('line', { x1: 16, y1: 13, x2: 8, y2: 13, key: 'l1' }),
    React.createElement('line', { x1: 16, y1: 17, x2: 8, y2: 17, key: 'l2' }),
    React.createElement('polyline', { points: "10 9 9 9 8 9", key: 'l3' })
  ),
  Close: () => createSvg(
    React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18, key: 'l1' }),
    React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18, key: 'l2' })
  ),
  Bolt: () => createSvg(
    React.createElement('polygon', { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2", key: 'p1' })
  ),
  Calculator: () => createSvg(
    React.createElement('rect', { x: 4, y: 2, width: 16, height: 20, rx: 2, key: 'r1' }),
    React.createElement('line', { x1: 8, y1: 6, x2: 16, y2: 6, key: 'l1' }),
    React.createElement('line', { x1: 16, y1: 14, x2: 16, y2: 18, key: 'l2' }),
    React.createElement('path', { d: "M16 10h.01", key: 'p1' }),
    React.createElement('path', { d: "M12 10h.01", key: 'p2' }),
    React.createElement('path', { d: "M8 10h.01", key: 'p3' }),
    React.createElement('path', { d: "M12 14h.01", key: 'p4' }),
    React.createElement('path', { d: "M8 14h.01", key: 'p5' }),
    React.createElement('path', { d: "M12 18h.01", key: 'p6' }),
    React.createElement('path', { d: "M12 18h.01", key: 'p6' }),
    React.createElement('path', { d: "M8 18h.01", key: 'p7' })
  ),
  ChevronRight: () => createSvg(
    React.createElement('polyline', { points: "9 18 15 12 9 6", key: 'p1' })
  ),
  Refresh: () => createSvg(
    React.createElement('polyline', { points: "23 4 23 10 17 10", key: 'p1' }),
    React.createElement('path', { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10", key: 'p2' })
  ),
  Clock: () => createSvg(
    React.createElement('circle', { cx: 12, cy: 12, r: 10, key: 'c1' }),
    React.createElement('polyline', { points: "12 6 12 12 16 14", key: 'p1' })
  ),
  AlertTriangle: () => createSvg(
    React.createElement('path', { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", key: 'p1' }),
    React.createElement('line', { x1: 12, y1: 9, x2: 12, y2: 13, key: 'l1' }),
    React.createElement('line', { x1: 12, y1: 17, x2: 12.01, y2: 17, key: 'l2' })
  ),
  TrendingUp: () => createSvg(
    React.createElement('polyline', { points: "23 6 13.5 15.5 8.5 10.5 1 18", key: 'p1' }),
    React.createElement('polyline', { points: "17 6 23 6 23 12", key: 'p2' })
  ),
  Download: () => createSvg(
    React.createElement('path', { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: 'p1' }),
    React.createElement('polyline', { points: "7 10 12 15 17 10", key: 'pl1' }),
    React.createElement('line', { x1: 12, y1: 15, x2: 12, y2: 3, key: 'l1' })
  ),
  Users: () => createSvg(
    React.createElement('path', { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", key: 'p1' }),
    React.createElement('circle', { cx: 9, cy: 7, r: 4, key: 'c1' }),
    React.createElement('path', { d: "M23 21v-2a4 4 0 0 0-3-3.87", key: 'p2' }),
    React.createElement('path', { d: "M16 3.13a4 4 0 0 1 0 7.75", key: 'p3' })
  )
};

export const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
