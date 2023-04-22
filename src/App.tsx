import testdata from './testdata.json';
import { Tree } from './Tree';
import { Sunburst } from './Sunburst';
import { useState } from 'react';
import { NavBar } from './Navbar';
import './navbar.css';
import { BaseData, Data, getDiscreteColors } from './util';

function App() {
  return (
    <div className="App">
      <Container />
    </div>
  );
}

export default App;

const processData = ({ children, value = 0, ...rest }: BaseData): Data => {
  return { children: children?.map((c) => processData(c)), value, color: '#eee', ...rest } as Data;
};

const Container = () => {
  const [graph, setGraph] = useState('sunburst');
  const data = processData(testdata);
  const colorSetter = getDiscreteColors(data.children?.length || 0 + 1);

  return (
    <>
      <NavBar graph={graph} setGraph={setGraph} />
      {graph === 'sunburst' ? (
        <Sunburst data={data} size={940} colorSetter={colorSetter} />
      ) : (
        <Tree data={data} size={1000} colorSetter={colorSetter} />
      )}
    </>
  );
};

App.propTypes = {};
