import * as d3 from 'd3';
import { tree } from 'd3';
import './tree.css';
import { useLayoutEffect, useRef, useState } from 'react';

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}

const MARGIN = 11;
const PADDING = 2;

type LayoutT = 'tidy' | 'radial';

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layoutType, setLayoutType] = useState<LayoutT>('tidy');

  const treeLayout = d3.tree<Data>().size([size, size]);
  const root = treeLayout(d3.hierarchy(data));

  const curve = d3.link<any, d3.HierarchyPointNode<Data>>(d3.curveBumpX);

  const tidyTree = curve.x((d) => d.y).y((d) => d.x);
  const radial = d3
    .linkRadial<any, d3.HierarchyPointNode<Data>>()
    .angle((d) => d.x)
    .radius((d) => d.y);

  const tidyTransform = (d) => `translate(${d.y},${d.x})`;
  const radialTransform = (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`;

  const setLinks = (d) => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => root.links()) // we must use a function to get this to update
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('d', d)
      .attr('stroke-width', 1);
  };

  const setNodes = (t) => {
    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', t); // place nodes at the right place

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
  };

  const setTree = () => {
    setLayoutType('tidy');
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
      if (d.x > distanceNegative) distanceNegative = d.x;
      if (d.x < distancePositive) distancePositive = d.x;
    });

    const height = distanceNegative - distancePositive + MARGIN * 2;

    d3.select(svgRef.current)
      .attr('viewBox', [(-linkLengthY * PADDING) / 2, distancePositive - MARGIN, size, height])
      .attr('width', size)
      .attr('height', height);
  };

  useLayoutEffect(() => {
    setTree();
    setLinks(tidyTree);
    setNodes(tidyTransform);

    return () => {
      linesRef.current.innerHTML = '';
      nodesRef.current.innerHTML = '';
    };
  }, []);

  const sort = (r: d3.HierarchyPointNode<Data>) => {
    let l;
    switch (layoutType) {
      case 'tidy':
        setTree();
        l = { d: tidyTree, t: tidyTransform };
        break;
      case 'radial':
        setRadial();
        l = { d: radial, t: radialTransform };
        break;
      default:
        l = { d: radial, t: radialTransform };
    }

    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => r.links())
      .join('path')
      .transition()
      .duration(750)
      .attr('d', l.d);

    d3.select(nodesRef.current)
      .selectAll('g')
      .data(r.descendants())
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', l.t); // place nodes at the right place
  };

  const setRadial = () => {
    setLayoutType('radial');
    const radius = (size - 60 * 2) / 2;

    tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth)(root);

    d3.select(svgRef.current)
      .attr('viewBox', [-60 - radius, -60 - radius, size, size])
      .attr('width', size)
      .attr('height', size);
  };

  const changeLayout = () => {
    setRadial();

    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => root.links())
      .join('path')
      .transition()
      .duration(750)
      .attr('d', radial);

    d3.select(nodesRef.current)
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', radialTransform);
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
        <button onClick={changeLayout}>changeLayout</button>
      </div>
      <div className="container">
        <svg ref={svgRef}>
          <g className="lines" ref={linesRef}></g>
          <g className="nodes" ref={nodesRef}></g>
        </svg>
      </div>
    </div>
  );
};
