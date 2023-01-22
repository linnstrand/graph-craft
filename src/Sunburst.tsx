import { useMemo, useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { Data, sortHeight } from './util';

export const Sunburst = ({ data, size }: { data: Data; size: number }) => {
  const ref = useRef<SVGSVGElement>(null);
  const width = size;

  const radius = width / 6;

  const root: d3.HierarchyRectangularNode<Data> = useMemo(() => {
    const p = d3.hierarchy(data);
    sortHeight(p);
    const r = d3.partition<Data>().size([2 * Math.PI, p.height + 1])(p);
    return r.each((d) => (d.data.current = d));
  }, [data, size]);

  // for every datum, add a slice to the arc
  const arc = d3
    .arc<d3.HierarchyRectangularNode<Data>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005)) // space between slices
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius) // radius for the inside of the circle
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1)); // radius for outside

  const arcVisible = (d: d3.HierarchyRectangularNode<Data>) =>
    d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;

  const labelVisible = (d: d3.HierarchyRectangularNode<Data>) =>
    d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;

  function labelTransform(d) {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI; // 180
    const y = ((d.y0 + d.y1) / 2) * radius; // translate 80, rotate 180

    // clockwise, distance, spin
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  useLayoutEffect(() => {
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

    const g = d3
      .select(ref.current)
      .append('g')
      .attr('transform', `translate(${width / 2},${width / 2})`);

    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => (arcVisible(d.data.current) ? (d.children ? 0.6 : 0.4) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.current) ? 'auto' : 'none'))
      .attr('d', (d) => arc(d.data.current));

    path
      .filter((d) => Boolean(d.children))
      .style('cursor', 'pointer')
      .on('click', (e, p) => clicked(p, parent, g, path, label));

    const label = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('font-size', (d) => {
        return `${Math.min(Math.round((d.x1 - d.x0) * radius + 2), 16)}px`;
      })
      .attr('fill-opacity', (d) => +labelVisible(d.data.current))
      .attr('transform', (d) => labelTransform(d.data.current))
      .text((d) => d.data.name);

    const parent = g
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('click', (_, p) => clicked(p, parent, g, path, label));

    return () => {
      ref.current.innerHTML = '';
    };
  }, []);

  function clicked(p, parent, g, path, label) {
    // p is the clicked element
    // parent of the clicked node should be center
    // parent.datum(p.parent || root);

    // for x: we are building left and right curve from the clicked element.
    // It needs to grow to fill the same percantage of the parent.
    // multiply by 2 to get diameter instead of .
    // for y:we need to substract the depth of the clicked element for new y.
    root.each(
      (d) =>
        (d.data.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        })
    );

    const t = g.transition().duration(750);
    path
      .transition(t)
      .tween('animated-slices', (d) => {
        const i = d3.interpolate(d.data.current, d.data.target);
        return (time) => (d.data.current = i(time));
      })
      .attr('fill-opacity', (d) => (arcVisible(d.data.target) ? (d.children ? 0.6 : 0.4) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.target) ? 'auto' : 'none'))
      .attrTween('d', (d) => () => arc(d.data.current));

    label
      .transition(t)
      .attr(
        'font-size',
        (d) => `${Math.min(Math.round((d.data.target.x1 - d.data.target.x0) * radius + 2), 14)}px`
      )
      .attr('fill-opacity', (d) => +labelVisible(d.data.target))
      .attrTween('transform', (d) => () => labelTransform(d.data.current));
  }

  return (
    <>
      <div className="container" style={{ margin: '10px' }}>
        <svg
          width={`${size}px`}
          height={`${size}px`}
          viewBox={`0 0 ${size} ${size}`}
          ref={ref}
        ></svg>
      </div>
    </>
  );
};
