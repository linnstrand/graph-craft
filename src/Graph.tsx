import React, { useRef, useState } from "react";
import * as d3 from "d3";
import data from "./testdata.json";

const SIZE = 975;
const RADIUS = SIZE / 2;

interface Data {
  name: string;
  value?: number;
}

export const Graph = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState("0,0,0,0");
  const [root, setRoot] = useState(() => {
    const p = d3.partition<Data>().size([2 * Math.PI, RADIUS])(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value)
    );
    return p.descendants().filter((d) => d.depth);
  });

  const arc = d3
    .arc<d3.HierarchyRectangularNode<Data>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(RADIUS / 2)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1 - 1);

  React.useEffect(() => {
    if (!svgRef.current) return;
    const { x, y, width, height } = svgRef.current.getBBox();
    setViewBox([x, y, width, height].toString());
  }, []);

  React.useLayoutEffect(() => {
    const color = d3.scaleOrdinal(
      d3.quantize(d3.interpolateRainbow, data.children.length + 1)
    );

    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .append("g")
      .selectAll("path")
      .data(root)
      .join("path")
      .attr("d", (d) => arc(d))
      .attr("fill", (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr("fill-opacity", 0.6);

    d3.select(svgRef.current)
      .append("g")
      .selectAll("text")
      .data(root)
      .join("text")
      .attr("transform", (d) => getTextTransform(d))
      .text((d) => d.data.name);
  }, [root]);

  const getTextTransform = (d: d3.HierarchyRectangularNode<Data>) => {
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    const y = (d.y0 + d.y1) / 2;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  };

  return <svg width={SIZE} height={SIZE} viewBox={viewBox} ref={svgRef}></svg>;
};
