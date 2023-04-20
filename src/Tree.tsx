import * as d3 from 'd3';
import './tree.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { addColor as createColorfulHierarchy, brighter, Data } from './util';

interface LayoutT {
  type: 'tidy' | 'radial';
  cluster: boolean;
}

interface GraphLayout {
  transform: (d: d3.HierarchyPointNode<Data>) => string;
  link:
    | d3.Link<unknown, unknown, d3.HierarchyPointNode<Data>>
    | d3.LinkRadial<unknown, unknown, d3.HierarchyPointNode<Data>>;
}

const MARGIN = 11;
const CIRCLE_RADIUS = 3;
const FONTSIZE = 10;
const FONTCOLOR = '#eee';
const ANIMATION_TIMER = 1000;

const tidyTree: GraphLayout = {
  transform: (d) => `translate(${d.y},${d.x})`,
  link: d3
    .link<unknown, d3.HierarchyPointNode<Data>>(d3.curveBumpX)
    .x((d) => d.y)
    .y((d) => d.x)
};

const radialTree: GraphLayout = {
  transform: (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`,
  link: d3
    .linkRadial<unknown, d3.HierarchyPointNode<Data>>()
    .angle((d) => d.x)
    .radius((d) => d.y)
};

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layout, setLayout] = useState<LayoutT>(null);
  const [labelLength, setLabelLength] = useState(60);

  useLayoutEffect(() => {
    // setLayoutRadial();
    setTreeLayout();
  }, []);

  const createNodes = (hierarchy: d3.HierarchyPointNode<Data>) => {
    // we want to set start position, same as nodes
    d3.select(linesRef.current)
      .selectAll('path')
      .data(() => hierarchy.links())
      .join('path')
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
      .data(() => hierarchy.descendants())
      .join('g')
      .attr('transform', `translate(0, ${size / 2})`)
      .attr('opacity', 0);

    // Maybe I should look att enter/exit/update nodes here
    nodes.append('circle').attr('r', CIRCLE_RADIUS);

    nodes
      .append('text')
      .attr('x', (d) => (d.children ? -6 : 6))
      .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .attr('paint-order', 'stroke')
      .attr('fill', FONTCOLOR)
      .attr('font-size', FONTSIZE)
      .attr('stroke', 'none')
      .text((d) => d.data.name);

    // make sure the labels are not pushed outside view
    const longestLabel = nodes.nodes().map((a: SVGGraphicsElement) => {
      return Math.ceil(a.getBBox().width);
    });
    return longestLabel.reduce((a, b) => Math.max(a, b));
  };

  const setTreeNodes = (tree: GraphLayout, root: d3.HierarchyPointNode<Data>) => {
    const hoverEffect = (a: d3.HierarchyPointNode<Data>[], type: string) => {
      if (type === 'mouseenter') {
        const activeNodes = nodes.filter((n) => a.indexOf(n) > -1);
        activeNodes
          .attr('fill', (d) => brighter(d.data.color))
          .attr('stroke', (d) => brighter(d.data.color));
        activeNodes.selectChild('text').attr('stroke', (d) => brighter(d.data.color));
        links
          .filter((n) => a.indexOf(n.target) > -1)
          .attr('stroke', (d) => brighter(d.target.data.color));
      } else {
        nodes
          .transition()
          .duration(150)
          .attr('fill', (d: d3.HierarchyPointNode<Data>) => d.data.color)
          .attr('stroke', (d: d3.HierarchyPointNode<Data>) => d.data.color);
        nodes.selectChild('text').attr('stroke', 'none');
        links
          .transition()
          .duration(150)
          .attr('stroke', (d) => d.target.data.color);
      }
    };

    // when we change these, we want to move from current to new.
    const links = d3
      .select(linesRef.current)
      .selectAll('path')
      .data(() => root.links())
      .join('path')
      .attr('stroke', (d: d3.HierarchyPointLink<Data>) => d.target.data.color);

    links.transition().duration(ANIMATION_TIMER).attr('d', tree.link);

    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(() => root.descendants())
      .join('g')
      .attr('fill', (d: d3.HierarchyPointNode<Data>) => d.data.color)
      .attr('stroke', (d: d3.HierarchyPointNode<Data>) => d.data.color);

    nodes
      .selectAll('circle')
      .attr('fill', (d: d3.HierarchyPointNode<Data>) => (d.children ? 'inherit' : 'none'));

    nodes
      .transition()
      .duration(ANIMATION_TIMER)
      .attr('opacity', 1)
      .attr('transform', tree.transform);

    links.on('mouseenter mouseout', (e, d) => {
      const a = d.target.ancestors();
      return hoverEffect(a, e.type);
    });

    nodes.on('mouseenter mouseout', (e, d) => {
      const a = d.ancestors();
      return hoverEffect(a, e.type);
    });
  };

  const setStartPosition = (transform: string) => {
    d3.select(linesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
    d3.select(nodesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
  };

  const setTreeLayout = (isCluster = false) => {
    const treeFn = isCluster ? d3.cluster : d3.tree;

    // d3.tree returns a layout function that sets the x and y coordinates for each node in the hierarchy in a manner that keeps nodes that are at the same depth aligned vertically
    // root height is the greatest distance from any descendant leaf.
    // node size here is distance between depths
    const treeLayout = treeFn<Data>().size([size, size]);
    const hierarchy = createColorfulHierarchy(treeLayout, data);

    // Height is number of nodes with root at the top, leaves at the bottom.
    // Every node get's a padding for the circle
    // the node height =  MARGIN. For length, we want to compensate for label
    treeLayout.nodeSize([MARGIN, size / hierarchy.height - labelLength])(hierarchy);

    let nodeLength = labelLength;
    if (!layout) {
      nodeLength = createNodes(hierarchy);
    }

    // recalculating nodeSize so that the nodes are not pushed outside view
    treeLayout.nodeSize([MARGIN, size / hierarchy.height - nodeLength / 2])(hierarchy);
    // Center the tree
    // if the tree is left/right (it is), x is used to calculate height
    let x0 = size;
    let x1 = -size;
    hierarchy.each((d) => {
      if (d.x > x1) x1 = d.x;
      if (d.x < x0) x0 = d.x;
    });

    const rootElement = d3.select(nodesRef.current).selectChild().node() as SVGGraphicsElement;
    // its better to adjust position with translate then changing the viewport
    setStartPosition(
      `translate(${Math.ceil(rootElement?.getBBox()?.width ?? nodeLength + MARGIN)},${
        -x0 + MARGIN
      })`
    );
    // We let tree height be dynamic to keep the margins and size
    const height = x1 - x0 + MARGIN * 2;
    const svg = d3.select(svgRef.current);
    svg.attr('height', () => height);
    svg.attr('viewBox', () => [0, 0, size, height]);
    setLabelLength(nodeLength);
    setLayout({ type: 'tidy', cluster: isCluster });

    setTreeNodes(tidyTree, hierarchy);

    return hierarchy;
  };

  const setLayoutRadial = (isCluster = false) => {
    const treeFn = isCluster ? d3.cluster : d3.tree;

    const treeLayout = treeFn<Data>();
    let hierarchy = treeLayout(d3.hierarchy(data));
    let maxLabelLength = labelLength;

    if (!layout) {
      // we dont want long labels to get pushed outside the viewbox,
      // so we need to recalculate size and position after creating the label
      maxLabelLength = createNodes(hierarchy);
    }

    const treeSize = isCluster ? (size - maxLabelLength * 2) / 2 : (size - maxLabelLength) / 2;
    const centering = isCluster ? size / 2 : (size + maxLabelLength) / 2;

    treeLayout
      .size([2 * Math.PI, treeSize])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth + 1);

    hierarchy = createColorfulHierarchy(treeLayout, data);

    setStartPosition(`translate(${centering},${centering})`);
    setLabelLength(maxLabelLength);
    const svg = d3.select(svgRef.current);
    svg.attr('height', size);
    svg.attr('viewBox', [0, 0, size, size]);
    setTreeNodes(radialTree, hierarchy);
    setLayout({ type: 'radial', cluster: isCluster });
  };

  return (
    <>
      <div className="settings">
        <button className={layout?.type === 'tidy' ? 'active' : ''} onClick={() => setTreeLayout()}>
          layout Tree
        </button>
        <button
          className={layout?.type === 'radial' ? 'active' : ''}
          onClick={() => setLayoutRadial()}
        >
          layout Radial
        </button>
        <div>
          <button
            className={layout?.cluster ? 'active' : ''}
            onClick={() => (layout?.type === 'tidy' ? setTreeLayout(true) : setLayoutRadial(true))}
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
