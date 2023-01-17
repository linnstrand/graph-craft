import * as d3 from 'd3';
import './tree.css';
import { useLayoutEffect, useRef, useState } from 'react';

interface Data {
  name: string;
  value?: number;
  children?: Data[];
}
type LayoutT = 'tidy' | 'radial';
interface GraphLayout {
  variant: LayoutT;
  transform: (d: d3.HierarchyPointNode<Data>) => string;
  link:
    | d3.Link<unknown, unknown, d3.HierarchyPointNode<Data>>
    | d3.LinkRadial<unknown, unknown, d3.HierarchyPointNode<Data>>;
}

const MARGIN = 11;
const PADDING = 2;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layoutType, setLayoutType] = useState<LayoutT | null>(null);

  const [root, setRoot] = useState<d3.HierarchyPointNode<Data | null>>(null);

  const curve = d3.link<unknown, d3.HierarchyPointNode<Data>>(d3.curveBumpX);

  const tidyTree: GraphLayout = {
    variant: 'tidy',
    transform: (d) => `translate(${d.y},${d.x})`,
    link: curve.x((d) => d.y).y((d) => d.x)
  };

  const radialTree: GraphLayout = {
    variant: 'radial',
    transform: (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`,
    link: d3
      .linkRadial<unknown, d3.HierarchyPointNode<Data>>()
      .angle((d) => d.x)
      .radius((d) => d.y)
  };

  const createLinks = (d, links: d3.HierarchyPointLink<Data>[]) => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => links) // we must use a function to get this to update
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('d', d)
      .attr('stroke-width', 1);
  };

  const setLines = (pathFn, links: d3.HierarchyPointLink<Data>[]) => {
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => links)
      .join('path')
      .transition()
      .duration(750)
      .attr('d', pathFn);
  };

  const createNodes = (t, data: d3.HierarchyPointNode<Data>[]) => {
    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(data)
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

  const setNodes = (transformFn, data: d3.HierarchyPointNode<Data>[]) => {
    d3.select(nodesRef.current)
      .selectAll('g')
      .data(data)
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', transformFn); // place nodes at the right place
  };

  const setTree = () => {
    // Compute the layout.
    // root height is the greatest distance from any descendant leaf for nodes. "opposite" of depth, but minus 1 as 0 is start.
    // node size here is distance between depths

    const treeLayout = d3.tree<Data>().size([size, size]);
    const root: d3.HierarchyPointNode<Data> = treeLayout(d3.hierarchy(data));
    setRoot(root);
    const linkLengthY = size / (root.height + PADDING);
    //height of node , length of link

    treeLayout.nodeSize([MARGIN, linkLengthY])(root);

    // Center the tree
    let distancePositive = Infinity;
    let distanceNegative = -Infinity;
    root.each((d) => {
      if (d.x > distanceNegative) distanceNegative = d.x;
      if (d.x < distancePositive) distancePositive = d.x;
    });

    const height = Math.ceil(distanceNegative - distancePositive + MARGIN * 2);

    d3.select(svgRef.current)
      .attr('viewBox', [-linkLengthY / 2, Math.ceil(distancePositive - MARGIN), size, height])
      .attr('width', size)
      .attr('height', height);

    if (!layoutType) {
      createLinks(tidyTree.link, root.links());
      createNodes(tidyTree.transform, root.descendants());
    }
    setLines(tidyTree.link, root.links());
    setNodes(tidyTree.transform, root.descendants());
    setLayoutType('tidy');
    return root;
  };

  const setLayoutRadial = () => {
    const radius = (size - 60 * 2) / 2;

    const treeLayout = d3
      .tree<Data>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const root = treeLayout(d3.hierarchy(data));
    setRoot(root);
    d3.select(svgRef.current)
      .attr('viewBox', [-60 - radius, -60 - radius, size, size])
      .attr('width', size)
      .attr('height', size);

    if (!layoutType) {
      createLinks(radialTree.link, root.links());
      createNodes(radialTree.transform, root.descendants());
    }

    setLines(radialTree.link, root.links());
    setNodes(radialTree.transform, root.descendants());
    setLayoutType('radial');
  };

  useLayoutEffect(() => {
    if (layoutType) return;
    setTree();
  }, []);

  const getLayoutTypeF = (): GraphLayout => {
    let l;
    switch (layoutType) {
      case 'tidy':
        l = tidyTree;
        break;
      case 'radial':
        l = radialTree;
        break;
      default:
        l = tidyTree;
    }
    return l;
  };

  const sortNodes = (sorter) => {
    const l = getLayoutTypeF();
    sorter();
    setLines(l.link, root.links());
    setNodes(l.transform, root.descendants());
  };

  const sortHeight = () => {
    sortNodes(() => root.sort((a, b) => d3.descending(a.height, b.height)));
  };

  const sortValue = () => {
    sortNodes(() => root.sum((d) => d.value).sort((a, b) => b.value - a.value));
  };

  return (
    <div className="container">
      <div className="settings">
        <button onClick={sortHeight}>Sort height</button>
        <button onClick={sortValue}>Sort default</button>
        <button onClick={setLayoutRadial}>layoutRadial</button>
        <button onClick={setTree}>layoutTree</button>
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
