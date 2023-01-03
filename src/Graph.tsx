import React, { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

const SIZE = 975;
const RADIUS = SIZE / 6;

function mathRound(val, decimals) {
  return parseFloat(val).toFixed(decimals);
}

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}
// figure out xy01 to set limits
export const Graph = ({ data }: { data: Data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0,0,0,0');
  const root = useMemo(() => {
    const p = d3.partition<Data>().size([2 * Math.PI, RADIUS * 4])(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value)
    );
    return p.descendants().filter((d) => d.depth < 3);
  }, [data]);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const { x, y, width, height } = svgRef.current.getBBox();
    setViewBox([x, y, width, height].toString());
  }, []);

  React.useLayoutEffect(() => {
    const arc = d3
      .arc<d3.HierarchyRectangularNode<Data>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(RADIUS)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1 - 1);

    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

    function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    if (!svgRef.current) return;
    svgRef.current.innerHTML = '';
    const svg = d3.select(svgRef.current);
    svg
      .append('g')
      .selectAll('path')
      .data(root.slice(1))
      .join('path')
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('d', (d) => arc(d))
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.6 : 0.4));

    svg
      .append('g')
      .selectAll('text')
      .data(root.filter((d) => ((d.y0 + d.y1) / 2) * (d.x1 - d.x0) > 10))
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill-opacity', (d) => labelVisible(d))
      .attr('font-size', (d) => `${Math.min(((d.y0 + d.y1) / 2) * (d.x1 - d.x0) - 6, 10)}px`)
      .attr('transform', (d: d3.HierarchyRectangularNode<Data>) => {
        if (!d.depth || !d.data.name) return;
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .text(
        (d) => `Top:${d.y0}-Bottom:${d.y1} Left:${mathRound(d.x0, 2)}-Right:${mathRound(d.x1, 2)}`
      );
  }, [root]);

  return <svg width={SIZE} height={SIZE} viewBox={viewBox} ref={svgRef}></svg>;
};
