import { useMemo, useRef, useLayoutEffect } from 'react';
import * as d3 from 'd3';
import { ChartParams, Data } from './util';

interface DataSun extends Data {
  target?: DataNode;
  current?: DataNode;
}

type DataNode = Partial<d3.HierarchyRectangularNode<DataSun>>;

export const sortHeight = (root: d3.HierarchyNode<DataSun>) =>
  root.sum((d) => d.value).sort((a, b) => b.value - a.value);

const setBranchColor = (d: DataNode, branchColor: string) => {
  // We increase brightness for items with children
  const { l, c, h } = d3.lch(branchColor);
  if (!d.children) {
    d.data.color = d3.lch(l + 15, c, h).toString();
    return;
  }
  // some color tweaking
  d.data.color = d3.lch(l + 5, c - 10, h).toString();
  d.children.forEach((c) => setBranchColor(c, branchColor));
};

export const Sunburst = ({ data, size, colorSetter }: ChartParams) => {
  const ref = useRef<SVGSVGElement>(null);

  const radius = size / 6;

  const root = useMemo(() => {
    const hirarchy = d3.hierarchy(data);
    sortHeight(hirarchy);
    const partition = d3.partition<DataSun>().size([2 * Math.PI, hirarchy.height + 1])(hirarchy);

    partition.children.forEach((d) => setBranchColor(d, colorSetter(d.data.name)));
    return partition.each((d) => (d.data.current = d));
  }, [data, size]);

  // for every datum, add a slice to the arc
  const setArc = d3
    .arc<DataNode>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005)) // space between slices
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius) // radius for the inside of the circle
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1)); // radius for outside

  // We only want to show 3 rings
  const arcVisible = (d: DataNode) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;

  // Hide labels that doesn't fit
  const labelVisible = (d: DataNode) =>
    d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;

  // center label text
  const labelTransform = (d: DataNode) => {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI; // 180
    const y = ((d.y0 + d.y1) / 2) * radius; // translate 80, rotate 180

    // clockwise, distance, spin
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  useLayoutEffect(() => {
    const container = d3
      .select(ref.current)
      .attr('transform', `translate(${size / 2},${size / 2})`);

    const slices = container
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d) => d.data.color)
      .attr('fill-opacity', (d) => (arcVisible(d.data.current) ? 1 : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.current) ? 'auto' : 'none'))
      .attr('d', (d) => setArc(d.data.current));

    slices
      .filter((d) => Boolean(d.children))
      .style('cursor', 'pointer')
      .on('click', (_, s) => clicked(s, center, container, slices, labels));

    const labels = container
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('font-size', (d) => {
        return `${Math.min(Math.floor((d.x1 - d.x0) * radius + 2), 14)}px`;
      })
      .attr('fill-opacity', (d) => +labelVisible(d.data.current))
      .attr('transform', (d) => labelTransform(d.data.current))
      .text((d) => d.data.name);

    container
      .append('text')
      .text(root.data.name)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18px')
      .attr('fill', '#ccc');

    const center = container
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('class', 'parent')
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('cursor', (d) => (d.depth > 0 ? 'pointer' : 'default'))
      .on('click', (_, c) => clicked(c, center, container, slices, labels));

    return () => {
      ref.current.innerHTML = '';
    };
  }, []);

  /**
   *
   * @param p The clicked element
   * @param parent Parent of the clicked element, that will be set to center
   * @param container To update the animations
   * @param slices Change the position of slices, their visibility and animate them
   * @param labels  Change the position of labels, their visibility and animate them
   */
  function clicked(
    p: DataNode,
    parent: d3.Selection<SVGCircleElement, DataNode, null, DataNode>,
    container: d3.Selection<SVGSVGElement, DataNode, null, DataNode>,
    slices: d3.Selection<d3.BaseType, DataNode, SVGGElement, DataNode>,
    labels: d3.Selection<d3.BaseType, DataNode, SVGGElement, DataNode>
  ) {
    parent.datum(p?.parent || root);
    const text = container.selectChild('text').attr('opacity', 0);
    text
      .text(() => {
        return `${p
          .ancestors()
          .map((d) => d.data.name)
          .reverse()
          .join('/')}`;
      })
      .transition()
      .duration(750)
      .attr('opacity', 1);

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

    const t = container.transition().duration(750);
    slices
      .transition(t)
      .tween('animated-slices', (d) => {
        const i = d3.interpolate(d.data.current, d.data.target);
        return (time) => (d.data.current = i(time));
      })
      .attr('fill-opacity', (d) => (arcVisible(d.data.target) ? 1 : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.target) ? 'auto' : 'none'))
      .attrTween('d', (d) => () => setArc(d.data.current));

    labels
      .transition(t)
      .attr(
        'font-size',
        (d) => `${Math.min(Math.floor((d.data.target.x1 - d.data.target.x0) * radius + 2), 14)}px`
      )
      .attr('fill-opacity', (d) => +labelVisible(d.data.target))
      .attrTween('transform', (d) => () => labelTransform(d.data.current));
  }

  return (
    <>
      <div className="container" style={{ margin: '10px' }}>
        <svg width={`${size}px`} height={`${size}px`} viewBox={`0 0 ${size} ${size}`}>
          <g ref={ref}></g>
        </svg>
      </div>
    </>
  );
};
