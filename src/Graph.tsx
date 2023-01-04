import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';

function mathRound(val, decimals) {
  return parseFloat(val).toFixed(decimals);
}

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}
// figure out xy01 to set limits
export const Graph = ({ data, size }: { data: Data; size: number }) => {
  const radius = size / 6;
  const svgRef = useRef<SVGSVGElement>(null);

  const root = useMemo(() => {
    const h = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    return d3.partition<Data>().size([2 * Math.PI, h.height + 1])(h);
  }, [data, size]);

  const [partition, setPartition] = useState(root.descendants().slice(1));

  useEffect(() => {
    const rings = root
      .descendants()
      .filter((d) => d.depth < 3)
      .slice(1);
    setPartition(rings);
  }, [root]);

  React.useLayoutEffect(() => {
    const arc = d3
      .arc<d3.HierarchyRectangularNode<Data>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

    if (!svgRef.current) return;
    svgRef.current.innerHTML = '';
    const svg = d3.select(svgRef.current);

    const g = svg.append('g').attr('transform', `translate(${size / 2},${size / 2})`);

    const path = g
      .append('g')
      .selectAll('path')
      .data(partition)
      .join('path')
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.6 : 0.4))
      .attr('d', (d) => arc(d));

    const center = g
      .append('circle')
      .datum(root)
      .attr('r', size / 6)
      .attr('fill', 'none')
      .attr('pointer-events', 'all');

    const label = g
      .append('g')
      .selectAll('text')
      .data(partition)
      .join('text')
      .attr('font-size', (d) => `${Math.min(((d.y0 + d.y1) / 2) * (d.x1 - d.x0) - 6, 10)}px`)
      .attr('transform', (d: d3.HierarchyRectangularNode<Data>) => {
        if (!d.depth || !d.data.name) return;
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .text((d) => `Y:${d.y1 - d.y0} X:${mathRound(Math.abs(d.x0 - d.x1), 4)}`);
  }, [root, size]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${size} ${size}`}
      ref={svgRef}
      preserveAspectRatio="xMidYMid"
    ></svg>
  );
};
