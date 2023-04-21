import * as d3 from 'd3';
import './tree.css';
import { useLayoutEffect, useRef, useState } from 'react';
import { ChartParams, Data } from './util';

type PointNode = d3.HierarchyPointNode<Data>;

interface LayoutT {
  type: 'tidy' | 'radial';
  cluster: boolean;
}

interface GraphLayout {
  transform: (d: PointNode) => string;
  link: d3.Link<unknown, unknown, PointNode> | d3.LinkRadial<unknown, unknown, PointNode>;
}

const MARGIN = 11;
const CIRCLE_RADIUS = 3;
const FONTSIZE = 10;
const FONTCOLOR = '#eee';
const ANIMATION_TIMER = 1000;

export const brighter = (color) => d3.rgb(color).brighter(2).formatRgb();

const tidyTree: GraphLayout = {
  transform: (d) => `translate(${d.y},${d.x})`,
  link: d3
    .link<unknown, PointNode>(d3.curveBumpX)
    .x((d) => d.y)
    .y((d) => d.x)
};

const radialTree: GraphLayout = {
  transform: (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`,
  link: d3
    .linkRadial<unknown, PointNode>()
    .angle((d) => d.x)
    .radius((d) => d.y)
};

const createColorfulHierarchy = (
  treeLayout: d3.TreeLayout<Data> | d3.ClusterLayout<Data>,
  data: Data,
  colorSetter: d3.ScaleOrdinal<string, string, never>
) => {
  const hierarchy = treeLayout(d3.hierarchy(data)).sort((a, b) =>
    d3.descending(a.height, b.height)
  );

  const setBranchColor = (d: d3.HierarchyPointNode<Data>, branchColor: string) => {
    d.data.color = branchColor;
    if (!d.children) return;
    d.children.forEach((c) => setBranchColor(c, branchColor));
  };

  hierarchy.children.forEach((d) => setBranchColor(d, colorSetter(d.data.name)));
  return hierarchy;
};

export const Tree = ({ data, size, colorSetter }: ChartParams) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);

  const [layout, setLayout] = useState<LayoutT>(null);
  const [labelLength, setLabelLength] = useState(60);

  useLayoutEffect(() => {
    setRadialLayout();
  }, []);

  const createNodes = (hierarchy: PointNode) => {
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

  const setTreeNodes = (tree: GraphLayout, root: PointNode) => {
    const hoverEffect = (a: PointNode[], type: string) => {
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
          .attr('fill', (d: PointNode) => d.data.color)
          .attr('stroke', (d: PointNode) => d.data.color);
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
      .attr('fill', (d: PointNode) => d.data.color)
      .attr('stroke', (d: PointNode) => d.data.color);

    nodes.selectAll('circle').attr('fill', (d: PointNode) => (d.children ? 'inherit' : 'none'));

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
    d3.select(nodesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
    d3.select(linesRef.current).transition().duration(ANIMATION_TIMER).attr('transform', transform);
  };

  const centerTree = (
    treeLayout: d3.TreeLayout<Data> | d3.ClusterLayout<Data>,
    isCluster: boolean
  ) => {
    const hierarchy = createColorfulHierarchy(treeLayout, data, colorSetter);
    treeLayout.size([size, size]);

    let nodeLength = labelLength;
    if (!layout) {
      // Height is number of nodes with root at the top, leaves at the bottom.
      // Every node get's a padding for the circle
      // the node height =  MARGIN. For length, we want to compensate for label
      treeLayout.nodeSize([MARGIN, size / hierarchy.height - labelLength]);
      nodeLength = createNodes(hierarchy);
      setLabelLength(nodeLength);
    }
    // recalculating nodeSize so that the nodes are not pushed outside view
    treeLayout.nodeSize([MARGIN, size / hierarchy.height - nodeLength / 2]);
    treeLayout(hierarchy);

    let right = size;
    let left = -size;
    hierarchy.each((d) => {
      if (d.x > left) left = d.x;
      if (d.x < right) right = d.x;
    });

    const rootElement = d3.select(nodesRef.current).selectChild().node() as SVGGraphicsElement;
    // its better to adjust position with translate then changing the viewport

    setStartPosition(
      `translate(${Math.ceil(rootElement?.getBBox()?.width ?? nodeLength + MARGIN)},${
        -right + MARGIN
      })`
    );
    // We let tree height be dynamic to keep the margins and size
    const height = left - right + MARGIN * 2;
    const svg = d3.select(svgRef.current);
    svg.attr('height', () => height);
    svg.attr('viewBox', () => [0, 0, size, height]);

    setTreeNodes(tidyTree, hierarchy);
    setLayout({ type: 'tidy', cluster: isCluster });
  };

  const setTreeLayout = () => {
    // d3.tree returns a layout function that sets the x and y coordinates for each node in the hierarchy in a manner that keeps nodes that are at the same depth aligned vertically
    // root height is the greatest distance from any descendant leaf.
    // node size here is distance between depths
    const treeLayout = d3.tree<Data>();

    centerTree(treeLayout, false);
  };

  const setTreeLayoutCluster = () => {
    const treeLayout = d3.cluster<Data>();

    centerTree(treeLayout, true);
  };

  const centerRadial = (
    treeLayout: d3.TreeLayout<Data> | d3.ClusterLayout<Data>,
    centering: number,
    treeSize: number
  ) => {
    treeLayout.size([2 * Math.PI, treeSize]);
    const hierarchy = createColorfulHierarchy(treeLayout, data, colorSetter);

    setStartPosition(`translate(${centering},${centering})`);
    const svg = d3.select(svgRef.current);
    svg.attr('height', size);
    svg.attr('viewBox', [0, 0, size, size]);
    setTreeNodes(radialTree, hierarchy);
  };

  const initializeRadial = (
    treeLayout: d3.TreeLayout<Data> | d3.ClusterLayout<Data>,
    isCluster: boolean
  ) => {
    treeLayout.separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth + 1);
    let maxLabelLength = labelLength;
    if (!layout) {
      // we dont want long labels to get pushed outside the viewbox,
      // so we need to recalculate size and position after creating the label
      maxLabelLength = createNodes(treeLayout(d3.hierarchy(data)));
      setLabelLength(maxLabelLength);
    }
    setLayout({ type: 'radial', cluster: isCluster });
    return maxLabelLength;
  };

  const setRadialLayout = () => {
    const treeLayout = d3.tree<Data>();
    const maxLabelLength = initializeRadial(treeLayout, false);

    const treeSize = (size - maxLabelLength) / 2;
    const centering = (size + maxLabelLength) / 2;

    centerRadial(treeLayout, centering, treeSize);
  };

  const setRadialCluster = () => {
    const treeLayout = d3.cluster<Data>();

    const labelLength = initializeRadial(treeLayout, true);
    const treeSize = (size - labelLength * 2) / 2;
    const centering = size / 2;

    centerRadial(treeLayout, centering, treeSize);
  };

  const toggleCluster = () => {
    if (layout?.cluster) {
      layout?.type === 'tidy' ? setTreeLayout() : setRadialLayout();
    } else {
      layout?.type === 'tidy' ? setTreeLayoutCluster() : setRadialCluster();
    }
  };

  return (
    <>
      <div className="settings">
        <button
          className={layout?.type === 'tidy' ? 'active' : ''}
          onClick={() => (layout.cluster ? setTreeLayoutCluster() : setTreeLayout())}
        >
          layout Tree
        </button>
        {' | '}
        <button
          className={layout?.type === 'radial' ? 'active' : ''}
          onClick={() => (layout.cluster ? setRadialCluster() : setRadialLayout())}
        >
          layout Radial
        </button>
        {' | '}
        <div>
          <button className={layout?.cluster ? 'active' : ''} onClick={() => toggleCluster()}>
            Toggle Cluster {layout?.cluster ? 'off' : 'on'}
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
