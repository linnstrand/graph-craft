import * as d3 from 'd3';
import { tree } from 'd3';
import './tree.css';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}

const MARGIN = 10;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const treeLayout = d3.tree<Data>().size([size, size]);
  const root = treeLayout(d3.hierarchy(data));

  // Compute the layout.
  const linkLengthY = size / (root.height + 1);
  //height of node , length of link
  tree().nodeSize([MARGIN, linkLengthY])(root);

  // Center the tree
  let xRight = Infinity;
  let xLeft = -xRight;
  root.each((d) => {
    if (d.x > xLeft) xLeft = d.x;
    if (d.x < xRight) xRight = d.x;
  });

  const curve = d3.link<any, d3.HierarchyPointNode<Data>>(d3.curveBumpX);

  useLayoutEffect(() => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => root.links()) // we must use a function to get this to update
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
      .attr('transform', (d) => `translate(${d.y},${d.x})`); // place nodes at the right place

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

  const sort1 = () => {
    const r = root.sort((a, b) => d3.descending(a.height, b.height));
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => r.links())
      .transition()
      .attr(
        'd',
        curve.x((d) => d.y).y((d) => d.x)
      );

    d3.select(nodesRef.current)
      .selectAll('g')
      .data(r.descendants())
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', (d) => `translate(${d.y},${d.x})`); // place nodes at the right place
  };

  const sort2 = () => {
    const r = root.sum((d) => d.value).sort((a, b) => b.value - a.value);
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => r.links())
      .transition()
      .attr(
        'd',
        curve.x((d) => d.y).y((d) => d.x)
      );

    d3.select(nodesRef.current)
      .selectAll('g')
      .data(r.descendants())
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', (d) => `translate(${d.y},${d.x})`); // place nodes at the right place
  };

  return (
    <div className="container">
      <div className="settings">
        <button onClick={sort1}>Sort height</button>
        <button onClick={sort2}>Sort default</button>
      </div>
      <div className="container">
        <svg
          width={`${size}px`}
          height={`${xLeft - xRight + MARGIN * 2}px`}
          viewBox={`${-linkLengthY / 2} ${xRight - MARGIN} ${size} ${xLeft - xRight + MARGIN * 2}`}
        >
          <g className="lines" ref={linesRef}></g>
          <g className="nodes" ref={nodesRef}></g>
        </svg>
      </div>
    </div>
  );
};
