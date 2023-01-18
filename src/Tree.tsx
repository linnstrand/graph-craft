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
const CIRCLE_RADIUS = 3;
const FONTSIZE = 10;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layoutType, setLayoutType] = useState<LayoutT | null>(null);

  const [root, setRoot] = useState<d3.HierarchyPointNode<Data | null>>(null);
  const [labelLength, setLabelLength] = useState(60);

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

  const createTreeNodes = () => {
    const nodes = d3.select(nodesRef.current); //.attr('transform', `rotate(90) translate(0,0)`); // place nodes at the right place
    nodes.append('circle').attr('r', CIRCLE_RADIUS);

    nodes
      .selectAll('text')
      .data([data])
      .join('text')
      .attr('x', () => 6)
      .attr('font-size', FONTSIZE)
      .attr('stroke-width', 4)
      .text((d) => d.name);

    const s = nodes.nodes().map((a: SVGGraphicsElement) => {
      return Math.ceil(a.getBBox().width);
    });
    return s.reduce((a, b) => Math.max(a, b));
  };

  const setTreeNodes = (tree: GraphLayout, root: d3.HierarchyPointNode<Data>) => {
    nodesRef.current.innerHTML = '';
    linesRef.current.innerHTML = '';

    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(() => root.descendants())
      .join('g');

    nodes.transition().duration(750).attr('transform', tree.transform); // place nodes at the right place

    nodes
      .append('circle')
      .attr('fill', (d) => (d.children ? '#999' : '#ccc'))
      .attr('r', CIRCLE_RADIUS);

    nodes
      .append('text')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('font-size', FONTSIZE)
      .attr('paint-order', 'stroke')
      .attr('stroke-width', 4)
      .attr('stroke', '#fff')
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .text((d) => d.data.name);

    d3.select(linesRef.current)
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1)
      .selectAll('path')
      .data(() => root.links())
      .join('path')
      .transition()
      .duration(750)
      .attr('d', tree.link);
  };

  const setTreeLayout = (nodeLength = labelLength) => {
    // Compute the layout.
    // d3.tree returns a layout function that sets the x and y coordinates for each node in the hierarchy in a manner that keeps nodes that are at the same depth aligned vertically
    // root height is the greatest distance from any descendant leaf.
    // node size here is distance between depths
    const treeLayout = d3.tree<Data>().size([size, size]);
    const root: d3.HierarchyPointNode<Data> = treeLayout(d3.hierarchy(data)); // set x/y

    // Height is number of nodes with root at the top, leaves at the bottom.
    // Every node get's a padding for the circle
    // the node height =  MARGIN. For length, we want to compensate for label
    treeLayout.nodeSize([MARGIN, size / root.height - labelLength])(root);

    // Center the tree
    // if the tree is left/right, x is used to calculate height
    let x0 = size;
    let x1 = -size;
    root.each((d) => {
      if (d.x > x1) x1 = Math.ceil(d.x);
      if (d.x < x0) x0 = Math.ceil(d.x);
    });

    const height = x1 - x0 + MARGIN * 2;
    treeLayout.nodeSize([MARGIN, size / root.height - nodeLength / 2])(root);

    const t = d3.select(nodesRef.current).select('g:first-child').node() as SVGGraphicsElement;
    const firstElem = t?.getBBox().width | nodeLength;

    // its better to adjust position with translate then changing the viewport
    const trans = `translate(${Math.ceil(firstElem + MARGIN)},${-x0 + MARGIN})`;
    d3.select(linesRef.current).attr('transform', trans).transition().duration(750).delay(750);
    d3.select(nodesRef.current).attr('transform', trans).transition().duration(750);

    const svg = d3.select(svgRef.current);
    svg.attr('height', () => height);
    svg.attr('viewBox', () => [0, 0, size, height]);

    setTreeNodes(tidyTree, root);

    setRoot(root);
    setLayoutType('tidy');
    return root;
  };

  const setLayoutRadial = (nodeLength = labelLength) => {
    const radius = (size - nodeLength) / 2;

    const treeLayout = d3
      .tree<Data>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const root = treeLayout(d3.hierarchy(data));

    const trans = `translate(${(size + nodeLength) / 2 + MARGIN},${
      (size + nodeLength) / 2 + MARGIN
    })`;
    d3.select(linesRef.current).attr('transform', trans);
    d3.select(nodesRef.current).attr('transform', trans);

    const svg = d3.select(svgRef.current);
    svg.attr('height', () => size);
    svg.attr('viewBox', () => [0, 0, size, size]);

    setTreeNodes(radialTree, root);
    setRoot(root);
    setLayoutType('radial');
  };

  useLayoutEffect(() => {
    if (layoutType) return;
    const nodeLength = createTreeNodes();
    setLabelLength(nodeLength);
    // setTree(nodeLength);
    setLayoutRadial(nodeLength);
  }, []);

  const sortNodes = (sorter) => {
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
    sorter();
    setTreeNodes(l, root);
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
        <button onClick={() => setLayoutRadial()}>layoutRadial</button>
        <button onClick={() => setTreeLayout()}>layoutTree</button>
      </div>
      <div className="container">
        <svg ref={svgRef} width={`${size}px`} height={`${size}px`} viewBox={`0 0 ${size} ${size}`}>
          <g className="lines" ref={linesRef}></g>
          <g className="nodes" ref={nodesRef}></g>
        </svg>
      </div>
    </div>
  );
};
