import { useState } from 'react';
import testdata from './testdata.json';
import tree from './tree.json';
import * as d3 from 'd3';
import { Tree } from './Tree';

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
  const [size, setSize] = useState(760);
  const data = tree as Data;
  return (
    <>
      <Tree data={{ ...testdata }} size={940} />
      {/* <Graph data={{ ...testdata }} size={size} /> */}
    </>
  );
};

App.propTypes = {};
