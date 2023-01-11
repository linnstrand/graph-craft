import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import * as d3 from 'd3';

function mathRound(val, decimals) {
  return parseFloat(val).toFixed(decimals);
}

interface Data {
  name: string;
  value?: number;
  children?: Data[];
  target?: d3.HierarchyRectangularNode<Data>;
  current?: d3.HierarchyRectangularNode<Data>;
}

export const Graph2 = ({ data, size }: { data: Data; size: number }) => {
  const radius = size / 6;
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeRings, setActiveRings] = useState<any>();

  const partition: d3.HierarchyRectangularNode<Data> = useMemo(() => {
    const h = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    return d3
      .partition<Data>()
      .size([2 * Math.PI, h.height + 1])(h)
      .each((d) => (d.data.current = d));
  }, [data]);

  const arc = d3
    .arc<d3.HierarchyRectangularNode<Data>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius)
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  const getColor = (d: d3.HierarchyRectangularNode<Data>) => {
    while (d.depth > 1) d = d.parent;
    return color(d.data.name);
  };

  useEffect(() => {
    const rings = partition.data.current
      .descendants()
      .filter((d) => d.depth < 5)
      .slice(1);
    setActiveRings(rings);
  }, [partition]);

  const getTextTransform = (p: d3.HierarchyRectangularNode<Data>) => {
    if (!p.depth || !p.data.name) return '';
    const x = (((p.x0 + p.x1) / 2) * 180) / Math.PI;
    const y = ((p.y0 + p.y1) / 2) * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  const onClick = (p: d3.HierarchyRectangularNode<Data>) => {
    const newRoot = partition.find((n) => n.value === p.value);

    newRoot.each(
      (d) =>
        (d.data.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        } as any)
    );

    const rings = newRoot.data.current
      .descendants()
      .filter((d) => d.depth < 5)
      .slice(1);
    setActiveRings(rings);
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${size} ${size}`}
      ref={svgRef}
      preserveAspectRatio="xMidYMid"
    >
      {activeRings && (
        <g transform={`translate(${size / 2},${size / 2})`}>
          <circle r={size / 6} fill="none" pointerEvents="all"></circle>
          <g>
            {activeRings.map((d, i) => (
              <React.Fragment key={`p-${d.data.name}-${i}`}>
                <path
                  d={arc(d)}
                  fill={getColor(d)}
                  fillOpacity={d.children ? 0.6 : 0.4}
                  onClick={() => onClick(d)}
                ></path>
                <text
                  fontSize={`${Math.min(((d.y0 + d.y1) / 2) * (d.x1 - d.x0) - 6, 10)}px`}
                  transform={getTextTransform(d)}
                >{`Y:${d.y1 - d.y0} X:${mathRound(Math.abs(d.x0 - d.x1), 4)}`}</text>
              </React.Fragment>
            ))}
          </g>
        </g>
      )}
    </svg>
  );
};

// export default function Arc({ d, i }: {d:any, i:any}) {
//   return (
//     <>
//       <path
//         key={`p-${d.data.name}-${i}`}
//         d={arc(d)}
//         fill={getColor(d)}
//         fillOpacity={d.children ? 0.6 : 0.4}
//         onClick={() => onClick(d)}
//       ></path>
//       <text
//         key={`t-${d.data.name}-${i}`}
//         fontSize={`${Math.min(((d.y0 + d.y1) / 2) * (d.x1 - d.x0) - 6, 10)}px`}
//         transform={getTextTransform(d)}
//       >{`Y:${d.y1 - d.y0} X:${mathRound(Math.abs(d.x0 - d.x1), 4)}`}</text>
//     </>
//   );
// }
