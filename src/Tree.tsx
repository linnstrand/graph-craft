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
    // prevent appending duplicates, since useLayoutEffect runs twice
    nodesRef.current.innerHTML = '';
    const nodes = d3
      .select(nodesRef.current)
      .attr('transform', `translate(${size / 2 + 75},${size / 2 + 75})`)
      .selectAll('g')
      .data(data)
      .join('g')
      .attr('transform', t); // place nodes at the right place

    nodes
      .append('circle')
      .attr('fill', (d) => (d.children ? '#999' : '#ccc'))
      .attr('r', CIRCLE_RADIUS);

    nodes
      .append('text')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('stroke', '#fff')
      .attr('font-size', FONTSIZE)
      .attr('stroke-width', 4)
      .text((d) => d.data.name);

    const s = nodes.nodes().map((a: SVGGraphicsElement) => {
      return Math.ceil(a.getBBox().width);
    });
    return s.reduce((a, b) => Math.max(a, b));
  };

  const setNodes = (transformFn, data: d3.HierarchyPointNode<Data>[]) => {
    d3.select(nodesRef.current)
      .selectAll('g')
      .data(() => data)
      .join('g')
      .transition()
      .duration(750)
      .attr('transform', transformFn); // place nodes at the right place
  };

  const setTree = () => {
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

    let nodeLength = labelLength;
    if (!layoutType) {
      nodeLength = createNodes(tidyTree.transform, root.descendants());
    }
    setLabelLength(nodeLength);
    const height = x1 - x0 + MARGIN * 2;
    treeLayout.nodeSize([MARGIN, size / root.height - nodeLength / 2])(root);

    const t = d3.select(nodesRef.current).select('g:first-child').node() as SVGGraphicsElement;
    const firstElem = Math.floor(t.getBBox().x);
    const svg = d3.select(svgRef.current);
    svg.attr('height', () => height);

    svg.attr('viewBox', () => [0, 0, size, height]);

    setLines(tidyTree.link, root.links());
    setNodes(tidyTree.transform, root.descendants());

    setRoot(root);
    setLayoutType('tidy');
    return root;
  };

  const setLayoutRadial = () => {
    const radius = size / 2;

    const treeLayout = d3
      .tree<Data>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const root = treeLayout(d3.hierarchy(data));

    let nodeLength = labelLength;
    if (!layoutType) {
      nodeLength = createNodes(radialTree.transform, root.descendants());
    }

    const svg = d3.select(svgRef.current);
    svg.attr('height', () => size);
    svg.attr('viewBox', () => [0, 0, size + 60, size]);

    setLines(radialTree.link, root.links());
    setNodes(radialTree.transform, root.descendants());
    setLabelLength(nodeLength);
    setRoot(root);
    setLayoutType('radial');
  };

  useLayoutEffect(() => {
    if (layoutType) return;
    const svg = d3.select(svgRef.current);
    svg.attr('width', size).attr('height', 0).transition().duration(750);
    d3.select(linesRef.current)
      .attr('transform', `translate(${size / 2 + 75},${size / 2 + 75})`)
      .attr('fill', 'none')
      .attr('stroke', '#666')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);

    //setTree();
    setLayoutRadial();
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
