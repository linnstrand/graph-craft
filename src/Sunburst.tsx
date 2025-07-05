import { useMemo, useRef, useLayoutEffect } from "react";
import * as d3 from "d3";
import { type GraphParams, type Data, sortByValue } from "./util";

interface RectanglePoints {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface SunburstNode extends d3.HierarchyRectangularNode<Data> {
  current: SunburstNode;
  target: SunburstNode;
}

export const Sunburst = ({ data, size, colorSetter }: GraphParams) => {
  const ref = useRef<SVGSVGElement>(null);
  const radius = size / 6;

  const root = useMemo(() => {
    const hirarchy = d3.hierarchy<Data>(data);
    sortByValue(hirarchy);

    const partition = d3
      .partition<Data>()
      .size([2 * Math.PI, hirarchy.height + 1])(hirarchy) as SunburstNode;

    partition.children?.forEach((d) =>
      setBranchColor(d, colorSetter(d.data.name))
    );
    return partition.each((d) => {
      (d as SunburstNode).current = d as SunburstNode;
    });
  }, [data, size]);

  // for every datum, add a slice to the arc
  const setArc = d3
    .arc<SunburstNode>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005)) // space between slices
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius) // radius for the inside of the circle
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1)); // radius for outside

  // We only want to show 3 rings
  const arcVisible = (d: RectanglePoints) =>
    d ? d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0 : false;

  // Hide labels that doesn't fit
  const labelVisible = (d: RectanglePoints) =>
    d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;

  // center label text
  const labelTransform = (d: SunburstNode) => {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI; // 180
    const y = ((d.y0 + d.y1) / 2) * radius; // translate 80, rotate 180

    // clockwise, distance, spin
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  useLayoutEffect(() => {
    if (!ref.current) return;

    const container = d3
      .select<d3.BaseType, unknown>(ref.current)
      .attr("transform", `translate(${size / 2},${size / 2})`);

    const slices = container
      .append("g")
      .selectAll<SVGPathElement, SunburstNode>("path")
      .data(root.descendants().slice(1))
      .join("path")
      .attr("fill", (d) => d.data.color)
      .attr("fill-opacity", (d) => (arcVisible(d.current) ? 1 : 0))
      .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
      .attr("d", (d) => setArc(d.current));

    slices
      .filter((d) => Boolean(d.children))
      .style("cursor", "pointer")
      .on("click", (_, s) => clicked(s, center, container, slices, labels));

    const labels = container
      .append("g")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .style("user-select", "none")
      .selectAll<SVGTextElement, SunburstNode>("text")
      .data(root.descendants().slice(1))
      .join("text")
      .attr("font-size", (d) => {
        return `${Math.min(Math.floor((d.x1 - d.x0) * radius + 2), 14)}px`;
      })
      .attr("fill-opacity", (d) => +labelVisible(d.current))
      .attr("transform", (d) => labelTransform(d.current))
      .text((d) => d.data.name);

    container
      .append("text")
      .text(root.data.name)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#ccc");

    const center = container
      .append<SVGCircleElement>("circle")
      .datum<SunburstNode>(root);
    center
      .attr("r", radius)
      .attr("class", "parent")
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .attr("cursor", (d) => (d.depth > 0 ? "pointer" : "default"))
      .on("click", (_, c) => clicked(c, center, container, slices, labels));

    return () => {
      if (!ref.current) return;
      ref.current.innerHTML = "";
    };
  }, []);

  /**
   *
   * @param p The clicked element
   * @param center Center circle
   * @param container To update the animations
   * @param slices Change the position of slices, their visibility and animate them
   * @param labels  Change the position of labels, their visibility and animate them
   */
  function clicked(
    p: SunburstNode,
    center: d3.Selection<SVGCircleElement, SunburstNode, null, undefined>,
    container: d3.Selection<d3.BaseType, unknown, null, unknown>,
    slices: d3.Selection<
      SVGPathElement,
      SunburstNode,
      SVGGElement,
      SunburstNode
    >,
    labels: d3.Selection<
      SVGTextElement,
      SunburstNode,
      SVGGElement,
      SunburstNode
    >
  ) {
    center.datum(p?.parent || root);
    const text = container.selectChild("text").attr("opacity", 0);
    text
      .text(() => {
        return `${p
          .ancestors()
          .map((d) => d.data.name)
          .reverse()
          .join("/")}`;
      })
      .transition()
      .duration(750)
      .attr("opacity", 1);

    // for x: we are building left and right curve from the clicked element.
    // It needs to grow to fill the same percantage of the parent.
    // multiply by 2 to get diameter instead of .
    // for y:we need to substract the depth of the clicked element for new y.
    root.each(
      (d) =>
        (d.target = {
          ...d.target,
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        } as SunburstNode)
    );

    const t = container.transition().duration(750);
    slices
      .transition(t)
      .tween("animated-slices", (d) => {
        const i = d3.interpolate(d.current, d.target);
        return (time) =>
          (d.current = { ...d.current, ...i(time) } as SunburstNode);
      })
      .attr("fill-opacity", (d) => (arcVisible(d.target) ? 1 : 0))
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      .attrTween("d", (d) => () => setArc(d.current) || "");

    labels
      .transition(t)
      .attr(
        "font-size",
        (d) =>
          `${Math.min(
            Math.floor((d.target.x1 - d.target.x0) * radius + 2),
            14
          )}px`
      )
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      .attrTween("transform", (d) => () => labelTransform(d.current));
  }

  return (
    <>
      <div className="container" style={{ margin: "10px" }}>
        <svg
          width={`${size}px`}
          height={`${size}px`}
          viewBox={`0 0 ${size} ${size}`}
        >
          <g ref={ref}></g>
        </svg>
      </div>
    </>
  );
};

const setBranchColor = (
  d: d3.HierarchyRectangularNode<Data>,
  branchColor: string
) => {
  // We increase brightness for items with children
  const { l, c, h } = d3.lch(branchColor);
  if (!d.children) {
    d.data.color = d3.lch(l + 15, c, h).toString();
    return;
  }
  // some color tweaking
  d.data.color = d3.lch(l + 5, c - 10, h).toString();
  d.children.forEach((c) => setBranchColor(c, branchColor));
};
