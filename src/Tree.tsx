import * as d3 from 'd3';
import { tree } from 'd3';
import React, { useLayoutEffect, useMemo, useRef } from 'react';

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const treeLayout = d3.tree<Data>().size([size, size]);
  const root = treeLayout(d3.hierarchy(data));

  // Compute the layout.
  const dx = 10;
  const dy = size / (root.height + 1);
  tree().nodeSize([dx, dy])(root);

  // Center the tree
  let x0 = Infinity;
  let x1 = -x0;
  root.each((d) => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const height = x1 - x0 + dx * 2;

  const curve = d3.link<any, d3.HierarchyPointNode<Data>>(d3.curveBumpX);

  useLayoutEffect(() => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr(
        'd',
        curve.x((d) => d.y).y((d) => d.x)
      )
      .attr('stroke-width', 1);

    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    nodes
      .append('circle')
      .attr('fill', (d) => (d.children ? '#999' : '#ccc'))
      .attr('r', 3);

    nodes
      .append('text')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('stroke', '#fff')
      .attr('font-size', 10)
      .attr('stroke-width', 3)
      .text((d) => d.data.name);

    return () => {
      linesRef.current.innerHTML = '';
      nodesRef.current.innerHTML = '';
    };
  }, []);

  return (
    <>
      <button>test</button>
      <div className="container">
        <svg
          width={`${size}px`}
          height={`${height}px`}
          viewBox={`${(-dy * 1) / 2} ${x0 - dx} ${size} ${height}`}
        >
          <g className="lines" ref={linesRef}></g>
          <g className="nodes" ref={nodesRef}></g>
        </svg>
      </div>
    </>
  );
};
