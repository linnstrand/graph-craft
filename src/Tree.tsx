import * as d3 from 'd3';
import './tree.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { Data, sortHeight, sortValue } from './util';

type LayoutT = 'tidy' | 'radial' | 'cluster';
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
const ANIMATION_TIMER = 1000;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layoutType, setLayoutType] = useState<LayoutT | null>(null);

  const [root, setRoot] = useState<d3.HierarchyPointNode<Data | null>>(null);
  const [labelLength, setLabelLength] = useState(60);

  const tidyTree: GraphLayout = {
    variant: 'tidy',
    transform: (d) => `translate(${d.y},${d.x})`,
    link: d3
      .link<unknown, d3.HierarchyPointNode<Data>>(d3.curveBumpX)
      .x((d) => d.y)
      .y((d) => d.x)
  };

  const radialTree: GraphLayout = {
    variant: 'radial',
    transform: (d) => `rotate(${Math.ceil((d.x * 180) / Math.PI - 90)}) translate(${d.y},0)`,
    link: d3
      .linkRadial<unknown, d3.HierarchyPointNode<Data>>()
      .angle((d) => d.x)
      .radius((d) => d.y)
  };

  useLayoutEffect(() => {
    if (layoutType) return;
    setTreeLayout();
    // setLayoutRadial();
  }, []);

  const createNodes = (data: d3.HierarchyPointNode<Data>[]) => {
    // we want to set start position, same as nodes
    d3.select(linesRef.current)
      .selectAll('path')
      .attr(
        'd',
        d3
          .linkHorizontal<unknown, unknown>()
          .x(() => 0)
          .y(() => size / 2)
      );

    // prevent appending duplicates, since useLayoutEffect runs twice
    nodesRef.current.innerHTML = '';

    // Start nodes invisible for nice fade in
    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(() => data)
      .join('g')
      .attr('transform', `translate(0, ${size / 2})`)
      .attr('opacity', 0);

    // Maybe I should look att enter/exit/update nodes here
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

    // make sure the labels are not pushed outside view
    const longestLabel = nodes.nodes().map((a: SVGGraphicsElement) => {
      return Math.ceil(a.getBBox().width);
    });
    return longestLabel.reduce((a, b) => Math.max(a, b));
  };

  const setTreeNodes = (tree: GraphLayout, root: d3.HierarchyPointNode<Data>) => {
    // when we change these, we want to move from current to new.
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => root.links())
      .join('path')
      .transition()
      .duration(ANIMATION_TIMER)
      .attr('d', tree.link);

    d3.select(nodesRef.current)
      .selectAll('g')
      .data(() => root.descendants())
      .join('g')
      .transition()
      .duration(ANIMATION_TIMER)
      .attr('opacity', 1)
      .attr('transform', tree.transform);
  };

  const setTreeLayout = (treeType: LayoutT = 'tidy') => {
    const treeFn = treeType === 'tidy' ? d3.tree : d3.cluster;
    // Compute the layout.
    // d3.tree returns a layout function that sets the x and y coordinates for each node in the hierarchy in a manner that keeps nodes that are at the same depth aligned vertically
    // root height is the greatest distance from any descendant leaf.
    // node size here is distance between depths
    let r = root;
    if (!layoutType || layoutType !== treeType) {
      const treeLayout = treeFn<Data>().size([size, size]);
      r = treeLayout(d3.hierarchy(data)); // set x/y

      // Height is number of nodes with root at the top, leaves at the bottom.
      // Every node get's a padding for the circle
      // the node height =  MARGIN. For length, we want to compensate for label
      treeLayout.nodeSize([MARGIN, size / r.height - labelLength])(r);

      let nodeLength = labelLength;
      if (!layoutType) {
        nodeLength = createNodes(r.descendants());
      }

      // recalculating nodeSize so that the nodes are not pushed outside view
      treeLayout.nodeSize([MARGIN, size / r.height - nodeLength / 2])(r);
      // Center the tree
      // if the tree is left/right (it is), x is used to calculate height
      let x0 = size;
      let x1 = -size;
      r.each((d) => {
        if (d.x > x1) x1 = Math.ceil(d.x);
        if (d.x < x0) x0 = Math.ceil(d.x);
      });

      // We let tree height be dynamic to keep the margins and size
      const height = x1 - x0 + MARGIN * 2;

      const rootElement = d3.select(nodesRef.current).selectChild().node() as SVGGraphicsElement;

      // its better to adjust position with translate then changing the viewport
      setStartPosition(
        `translate(${Math.ceil(rootElement?.getBBox()?.width ?? nodeLength + MARGIN)},${
          -x0 + MARGIN
        })`
      );
      const svg = d3.select(svgRef.current);
      svg.attr('height', () => height);
      svg.attr('viewBox', () => [0, 0, size, height]);
      setLabelLength(nodeLength);
      setRoot(r);
      setLayoutType(treeType);
    }
    setTreeNodes(tidyTree, r);

    return r;
  };

  const setStartPosition = (transform: string) => {
    d3.select(linesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
    d3.select(nodesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
  };

  const setLayoutRadial = () => {
    let r = root;
    if (layoutType !== 'radial') {
      const radius = (size - labelLength) / 2;

      const treeLayout = d3
        .tree<Data>()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

      r = treeLayout(d3.hierarchy(data));

      let nodeLength = labelLength;
      if (!layoutType) {
        nodeLength = createNodes(r.descendants());
      }
      setStartPosition(
        `translate(${(size + nodeLength) / 2 + MARGIN},${(size + nodeLength) / 2 + MARGIN})`
      );

      setLabelLength(nodeLength);
      setRoot(r);
    }

    const svg = d3.select(svgRef.current);
    svg.attr('height', size);
    svg.attr('viewBox', [0, 0, size, size]);
    setTreeNodes(radialTree, r);
    setLayoutType('radial');
  };

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
    sorter(root);
    setTreeNodes(l, root);
  };

  return (
    <>
      <div className="settings">
        <button onClick={() => sortNodes(sortHeight)}>Sort by height</button>
        <button onClick={() => sortNodes(sortValue)}>Sort by value</button>
        <button className={layoutType === 'tidy' ? 'active' : ''} onClick={() => setTreeLayout()}>
          layout Tree
        </button>
        <button className={layoutType === 'radial' ? 'active' : ''} onClick={setLayoutRadial}>
          layout Radial
        </button>
        <div>
          <button
            className={layoutType === 'cluster' ? 'active' : ''}
            onClick={() => setTreeLayout('cluster')}
          >
            layout Cluster
          </button>
        </div>
      </div>
      <div className="tree-container">
        <div className="container">
          <svg
            ref={svgRef}
            width={`${size}px`}
            height={`${size}px`}
            viewBox={`0 0 ${size} ${size}`}
          >
            <g className="lines" ref={linesRef}></g>
            <g className="nodes" ref={nodesRef}></g>
          </svg>
        </div>
      </div>
    </>
  );
};
