import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const [size, setSize] = useState(540);
  const ref = useRef<HTMLDivElement>(null);
  const width = size;

  const radius = width / 6;

  useLayoutEffect(() => {
    const partition = (data) => {
      const root = d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value);
      console.log(2 * Math.PI, root.height + 1);
      return d3.partition<Data>().size([2 * Math.PI, root.height + 1])(root);
    };
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, testdata.children.length + 1));

    // node.x0 - the left edge of the rectangle
    // node.y0 - the top edge of the rectangle
    // node.x1 - the right edge of the rectangle
    // node.y1 - the bottom edge of the rectangle

    //for every datum, add a slice to the arc
    const arc = d3
      .arc<d3.HierarchyRectangularNode<Data>>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005)) // space between slices
      .padRadius(radius * 1.5)
      .innerRadius((d) => d.y0 * radius) //radius for the inside of the circle
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1)); // radius for outside

    const root = partition(testdata);
    root.each((d) => (d.data.current = d));
    console.log(root);

    function arcVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
      return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
      const y = ((d.y0 + d.y1) / 2) * radius;
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    const svg = d3
      .select(ref.current)
      .append('svg')
      .attr('viewBox', [0, 0, width, width])
      .attr('class', 'sun');

    const g = svg.append('g').attr('transform', `translate(${width / 2},${width / 2})`);

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
      .on('click', clicked);

    const label = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
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
      .on('click', clicked);

    function clicked(_, clickedArc: d3.HierarchyRectangularNode<Data>) {
      parent.datum(clickedArc.parent || root);

      root.each(
        (d) =>
          (d.data.target = {
            x0:
              Math.max(0, Math.min(1, (d.x0 - clickedArc.x0) / (clickedArc.x1 - clickedArc.x0))) *
              2 *
              Math.PI,
            x1:
              Math.max(0, Math.min(1, (d.x1 - clickedArc.x0) / (clickedArc.x1 - clickedArc.x0))) *
              2 *
              Math.PI,
            y0: Math.max(0, d.y0 - clickedArc.depth),
            y1: Math.max(0, d.y1 - clickedArc.depth)
          })
      );

      const t = g.transition().duration(750);

      path
        .transition(t)
        .tween('data', (d) => {
          const i = d3.interpolate(d.data.current, d.data.target);
          return (t) => (d.data.current = i(t));
        })
        .filter((d) => {
          return Boolean(this.getAttribute('fill-opacity') || arcVisible(d.data.target));
        })
        .attr('fill-opacity', (d) => (arcVisible(d.data.target) ? (d.children ? 0.6 : 0.4) : 0))
        .attr('pointer-events', (d) => (arcVisible(d.data.target) ? 'auto' : 'none'))
        .attrTween('d', (d) => () => arc(d.data.current));

      label
        .filter((d) => {
          return Boolean(this.getAttribute('fill-opacity') || labelVisible(d.data.target));
        })
        .transition(t)
        .attr('fill-opacity', (d) => +labelVisible(d.data.target))
        .attrTween('transform', (d) => () => labelTransform(d.data.current));
    }

    return () => {
      ref.current.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    setSize(Math.min(ref.current.offsetWidth, ref.current.offsetHeight));
  }, []);

  return (
    <>
      <div ref={ref} className="container"></div>
      <div className="container">
        <Graph data={testdata} size={size} />
      </div>
    </>
  );
};

App.propTypes = {};
