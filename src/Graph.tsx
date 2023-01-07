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

interface Slice {
  current: d3.HierarchyRectangularNode<Data>;
  target?: d3.HierarchyRectangularNode<Data>;
}
// figure out xy01 to set limits
export const Graph = ({ data, size }: { data: Data; size: number }) => {
  const radius = size / 6;
  const svgRef = useRef<SVGSVGElement>(null);

  const partition: Slice = useMemo(() => {
    const h = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    return { current: d3.partition<Data>().size([2 * Math.PI, h.height + 1])(h) };
  }, [data, size]);

  const [activeRings, setActiveRings] = useState<d3.HierarchyRectangularNode<Data>[] | undefined>();

  useEffect(() => {
    const rings = partition.current
      .descendants()
      .filter((d) => d.depth < 3)
      .slice(1);
    setActiveRings(rings);
  }, [partition]);

  React.useEffect(() => {
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
      .data(activeRings)
      .join('path')
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => (d.children ? 0.6 : 0.4))
      .attr('d', (d) => arc(d))
      .on('click', clicked);

    const center = g
      .append('circle')
      .datum(partition)
      .attr('r', size / 6)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('click', clicked);

    const label = g
      .append('g')
      .selectAll('text')
      .data(activeRings)
      .join('text')
      .attr('font-size', (d) => `${Math.min(((d.y0 + d.y1) / 2) * (d.x1 - d.x0) - 6, 10)}px`)
      .attr('transform', (d: d3.HierarchyRectangularNode<Data>) => {
        if (!d.depth || !d.data.name) return;
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .text((d) => `Y:${d.y1 - d.y0} X:${mathRound(Math.abs(d.x0 - d.x1), 4)}`);

    function clicked(_, newParent: d3.HierarchyRectangularNode<Data>) {
      //const newRoot = root.find((n) => n.value === newParent.value);
      center.datum(newParent.parent || partition);
      setActiveRings(
        newParent
          .descendants()
          .filter((d) => d.depth < d.depth + 3)
          .slice(1)
      );

      const slice = {
        current: partition,
        target: partition.current.copy().each(
          (d) =>
            (d = {
              ...d,
              x0:
                Math.max(0, Math.min(1, (d.x0 - newParent.x0) / (newParent.x1 - newParent.x0))) *
                2 *
                Math.PI,
              x1:
                Math.max(0, Math.min(1, (d.x1 - newParent.x0) / (newParent.x1 - newParent.x0))) *
                2 *
                Math.PI,
              y0: Math.max(0, d.y0 - newParent.depth),
              y1: Math.max(0, d.y1 - newParent.depth)
            })
        )
      };

      const t = g.transition().duration(750);

      path
        .transition(t)
        .tween('data', (d) => {
          const i = d3.interpolate(d.current, d.target);
          return (t) => (d.current = i(t));
        })
        .filter((d) => {
          return Boolean(this.getAttribute('fill-opacity') || arcVisible(d.target));
        })
        .attr('fill-opacity', (d) => (arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0))
        .attr('pointer-events', (d) => (arcVisible(d.target) ? 'auto' : 'none'))
        .attrTween('d', (d) => () => arc(d.current));

      label
        .filter((d) => {
          return Boolean(this.getAttribute('fill-opacity') || labelVisible(d.target));
        })
        .transition(t)
        .attr('fill-opacity', (d) => +labelVisible(d.target))
        .attrTween('transform', (d) => () => labelTransform(d.current));

      function arcVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
      }
      function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
      }

      function labelTransform(d) {
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      }
    }
  }, [activeRings, size]);

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
