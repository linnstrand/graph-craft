import testdata from './testdata.json';
import { Tree } from './Tree';
import { Sunburst } from './Sunburst';
import { useState } from 'react';
import { NavBar } from './Navbar';
import './navbar.css';
import { getDiscreteColors } from './util';

function App() {
  return (
    <div className="App">
      <Container />
    </div>
  );
}

export default App;

const Container = () => {
  const [graph, setGraph] = useState('tree');
  const data = { ...testdata };
  const colorSetter = getDiscreteColors(data.children.length + 1);

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
