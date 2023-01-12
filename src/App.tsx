import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Graph } from './Graph';
import testdata from './testdata.json';
import * as d3 from 'd3';

interface Data {
  name: string;
  value?: number;
  target?: any; //Partial<d3.HierarchyRectangularNode<Data>>;
  current?: d3.HierarchyRectangularNode<Data>;
  children?: Data[];
}

function App() {
  return (
    <div className="App">
      <Container />
    </div>
  );
}

export default App;

const Container = () => {
  const [size, setSize] = useState(960);
  const data = testdata as Data;
  const ref = useRef<SVGSVGElement>(null);
  const width = size;

  const radius = width / 6;

  const root: d3.HierarchyRectangularNode<Data> = useMemo(() => {
    const p = d3
      .hierarchy(data)
      .sum((d) => d.value)
      .sort((a, b) => b.value - a.value);
    const r = d3.partition<Data>().size([2 * Math.PI, p.height + 1])(p);
    return r.each((d) => (d.data.current = d));
  }, [data, size]);

  //for every datum, add a slice to the arc
  const arc = d3
    .arc<d3.HierarchyRectangularNode<Data>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005)) // space between slices
    .padRadius(radius * 1.5)
    .innerRadius((d) => d.y0 * radius) //radius for the inside of the circle
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1)); // radius for outside

  function arcVisible(d) {
    return d.y1 <= 3 && d.x1 > d.x0;
  }

  function labelVisible(d) {
    return d.y1 <= 3 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.04;
  }

  function labelTransform(d) {
    if (d.y0 > 0) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI; //180
      const y = ((d.y0 + d.y1) / 2) * radius; // translate 80, rotate 180

      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
    return '';
  }

  useLayoutEffect(() => {
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, testdata.children.length + 1));

    const g = d3
      .select(ref.current)
      .append('g')
      .attr('transform', `translate(${width / 2},${width / 2})`);

    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('fill', (d) => {
        while (d.depth > 1) d = d.parent;
        return color(d.data.name);
      })
      .attr('fill-opacity', (d) => (arcVisible(d.data.current) ? (d.children ? 0.6 : 0.4) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.current) ? 'auto' : 'none'))
      .attr('d', (d) => arc(d.data.current));

    path
      .filter((d) => Boolean(d.children))
      .style('cursor', 'pointer')
      .on('click', (e, p) => clicked(e, p, parent, g, path, label));

    const label = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants())
      .join('text')
      .attr('font-size', (d) => `${Math.min(Math.round((d.x1 - d.x0) * radius + 2), 16)}px`)
      .attr('alignment-baseline', 'middle')
      .attr('fill-opacity', (d) => +labelVisible(d.data.current))
      .attr('transform', (d) => labelTransform(d.data.current))
      .text((d) => d.data.name);

    const parent = g
      .append('circle')
      .datum(root)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('click', (e, p) => clicked(e, p, parent, g, path, label));

    return () => {
      ref.current.innerHTML = '';
    };
  }, []);

  function clicked(e, p, parent, g, path, label) {
    const el = e.target; //path

    parent.datum(p.parent || root);

    root.each(
      (d) =>
        (d.data.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth)
        })
    );

    const t = g.transition().duration(750);
    path
      .transition(t)
      .tween('animated-slices', (d) => {
        const i = d3.interpolate(d.data.current, d.data.target);
        return (time) => (d.data.current = i(time));
      })
      .attr('fill-opacity', (d) => (arcVisible(d.data.target) ? (d.children ? 0.6 : 0.4) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.data.target) ? 'auto' : 'none'))
      .attrTween('d', (d) => () => arc(d.data.current));

    label

      .transition(t)
      .attr('fill-opacity', (d) => +labelVisible(d.data.target))
      .attrTween('transform', (d) => () => labelTransform(d.data.current));
  }

  return (
    <>
      <div className="container">
        <svg
          width={`${size}px`}
          height={`${size}px`}
          viewBox={`0 0 ${size} ${size}`}
          ref={ref}
        ></svg>
      </div>
      <Graph data={testdata} size={size} />
    </>
  );
};

App.propTypes = {};
