import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Graph } from './Graph';
import testdata from './testdata.json';
import * as d3 from 'd3';
import { Graph2 } from './Graph2';

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

  useEffect(() => {
    setSize(Math.min(ref.current.offsetWidth, ref.current.offsetHeight));
  }, []);

  return (
    <>
      <div className="container" ref={ref}>
        <Graph data={testdata} size={size} />
        <Graph2 data={testdata} size={size} />
      </div>
    </>
  );
};

App.propTypes = {};
