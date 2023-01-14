import * as d3 from 'd3';
import { tree } from 'd3';
import './tree.css';
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}

const MARGIN = 11;
const PADDING = 2;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const treeLayout = d3.tree<Data>().size([size, size]);
  const root = treeLayout(d3.hierarchy(data));

  // Compute the layout.
  // root height is the greatest distance from any descendant leaf for nodes. "opposite" of depth, but minus 1 as 0 is start.
  // node size here is distance between depths
  const linkLengthY = size / (root.height + PADDING);

  //height of node , length of link
  tree().nodeSize([MARGIN, linkLengthY])(root);

  // Center the tree
  let distancePositive = Infinity;
  let distanceNegative = -Infinity;
  root.each((d) => {
    if (d.depth === 4) {
      console.log(d);
    }
    if (d.x > distanceNegative) distanceNegative = d.x;
    if (d.x < distancePositive) distancePositive = d.x;
  });

  const height = distanceNegative - distancePositive + MARGIN * 2;

  const curve = d3.link<any, d3.HierarchyPointNode<Data>>(d3.curveBumpX);

  useLayoutEffect(() => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => root.links()) // we must use a function to get this to update
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
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
      .attr('stroke-width', 4)
      .text((d) => d.data.name);

    return () => {
      linesRef.current.innerHTML = '';
      nodesRef.current.innerHTML = '';
    };
  }, []);

  const sort = (r: d3.HierarchyPointNode<Data>) => {
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

  const sortHeight = () => {
    sort(root.sort((a, b) => d3.descending(a.height, b.height)));
  };

  const sortValue = () => {
    sort(root.sum((d) => d.value).sort((a, b) => b.value - a.value));
  };

  return (
    <div className="container">
      <div className="settings">
        <button onClick={sortHeight}>Sort height</button>
        <button onClick={sortValue}>Sort default</button>
      </div>
      <div className="container">
        <svg
          width={`${size}px`}
          height={`${height}px`}
          viewBox={`${(-linkLengthY * PADDING) / 2} ${distancePositive - MARGIN} ${size} ${height}`}
        >
          <g className="lines" ref={linesRef}></g>
          <g className="nodes" ref={nodesRef}></g>
        </svg>
      </div>
    </div>
  );
};
