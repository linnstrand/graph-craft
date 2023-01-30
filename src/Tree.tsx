import * as d3 from 'd3';
import './tree.css';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Data } from './util';

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
const FONTCOLOR = '#eee';
const ANIMATION_TIMER = 1000;

export const Tree = ({ data, size }: { data: Data; size: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);
  // COLOR!
  // ordinal scales have a discrete domain and range
  // quantize: Quantize scales are similar to linear scales, except they use a discrete rather than continuous range. Returns uniformly-spaced samples from the specified interpolator

  // interpolateRainbow: Cyclical. (interpolateSinebow is an alternative)
  // Given a number t in the range [0,1], returns the corresponding color from d3.interpolateWarm scale from [0.0, 0.5] followed by the d3.interpolateCool scale from [0.5, 1.0],
  // thus implementing the cyclical less-angry rainbow color scheme.

  // This means that colors without children are muted

  // we want one color base for every child of parent
  const quant = d3.quantize(d3.interpolateRainbow, data.children.length + 1);
  const color = d3.scaleOrdinal(quant);

  const coloredData = useMemo(() => {
    const recursive = (d, branchColor) => {
      d.color = branchColor;
      d.children?.forEach((c) => recursive(c, branchColor));
    };

    const treated = { ...data };
    treated.children.forEach((d) => recursive(d, color(d.name)));
    return treated;
  }, [data]);

  let variant = 'tree';

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
    transform: (d) => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`,
    link: d3
      .linkRadial<unknown, d3.HierarchyPointNode<Data>>()
      .angle((d) => d.x)
      .radius((d) => d.y)
  };

  useLayoutEffect(() => {
    if (layoutType) return;
    setTreeLayout('tree');
    // setLayoutRadial('tree');
  }, []);

  const createNodes = (root: d3.HierarchyPointNode<Data>[]) => {
    // we want to set start position, same as nodes
    d3.select(linesRef.current)
      .selectAll('path')
      .attr('stroke', (d: d3.HierarchyPointLink<Data>) => d.target.data.color)
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
      .data(() => root)
      .join('g')
      .attr('transform', `translate(0, ${size / 2})`)
      .attr('opacity', 0)
      .attr('fill', (d: d3.HierarchyPointNode<Data>) => d.data.color)
      .attr('stroke', (d: d3.HierarchyPointNode<Data>) => d.data.color);

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
    // when we change these, we want to move from current to new.
    const links = d3
      .select(linesRef.current)
      .selectAll('path')
      .data(() => root.links())
      .join('path');
    links.transition().duration(ANIMATION_TIMER).attr('d', tree.link);

    const nodes = d3
      .select(nodesRef.current)
      .selectAll('g')
      .data(() => root.descendants())
      .join('g');

    const hoverEffect = (a: d3.HierarchyPointNode<Data>[], type: string) => {
      if (type === 'mouseenter') {
        nodes
          .filter((n) => {
            return a.indexOf(n) > -1;
          })
          .attr('stroke', 'blue');

        links
          .filter((n) => {
            return a.indexOf(n.target) > -1;
          })
          .attr('stroke', 'blue');
      } else {
        nodes.attr('fill', (d: d3.HierarchyPointNode<Data>) => d.data.color);
        nodes.attr('stroke', (d: d3.HierarchyPointNode<Data>) => d.data.color);
        links.attr('stroke', (d) => d.target.data.color);
      }
    };

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

  const setTreeLayout = (v) => {
    const treeFn = v === 'tree' ? d3.tree : d3.cluster;
    variant = v;

    // d3.tree returns a layout function that sets the x and y coordinates for each node in the hierarchy in a manner that keeps nodes that are at the same depth aligned vertically
    // root height is the greatest distance from any descendant leaf.
    // node size here is distance between depths
    const treeLayout = treeFn<Data>().size([size, size]);
    const r = treeLayout(d3.hierarchy(coloredData)).sort((a, b) =>
      d3.descending(a.height, b.height)
    ); // set x/y
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
    setRoot(r);
    setLayoutType('tidy');

    setTreeNodes(tidyTree, r);

    return r;
  };

  const setLayoutRadial = (v: 'tree' | 'cluster') => {
    const treeFn = v === 'tree' ? d3.tree : d3.cluster;
    let r = root;
    variant = v;

    let treeLayout = treeFn<Data>().size([2 * Math.PI, size / 2]);
    r = treeLayout(d3.hierarchy(coloredData));
    let nodeLength = labelLength;
    if (!layoutType) {
      nodeLength = createNodes(r.descendants());
    }
    treeLayout = treeFn<Data>()
      .size([2 * Math.PI, (size - nodeLength * 2) / 2])
      .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    r = treeLayout(d3.hierarchy(coloredData)).sort((a, b) => d3.descending(a.height, b.height));
    setStartPosition(`translate(${size / 2},${size / 2})`);

    setLabelLength(nodeLength);
    setRoot(r);
    const svg = d3.select(svgRef.current);
    svg.attr('height', size);
    svg.attr('viewBox', [0, 0, size, size]);
    setTreeNodes(radialTree, r);
    setLayoutType('radial');
  };

  return (
    <>
      <div className="settings">
        <button
          className={layoutType === 'tidy' ? 'active' : ''}
          onClick={() => setTreeLayout('tree')}
        >
          layout Tree
        </button>
        <button
          className={layoutType === 'radial' ? 'active' : ''}
          onClick={() => setLayoutRadial('tree')}
        >
          layout Radial
        </button>
        <div>
          <button
            className={variant === 'cluster' ? 'active' : ''}
            onClick={() =>
              layoutType === 'tidy' ? setTreeLayout('cluster') : setLayoutRadial('cluster')
            }
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
