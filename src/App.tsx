import testdata from './testdata.json';
import { Tree } from './Tree';
import { Sunburst } from './Sunburst';
import { useState } from 'react';
import { NavBar } from './Navbar';
import './navbar.css';

function App() {
  return (
    <div className="App">
      <Container />
    </div>
  );
}

export default App;

const Container = () => {
  const [graph, setGraph] = useState('sunburst');
  return (
    <div className="container">
      <NavBar graph={graph} setGraph={setGraph} />
      {graph === 'sunburst' ? (
        <Sunburst data={{ ...testdata }} size={940} />
      ) : (
        <Tree data={{ ...testdata }} size={1040} />
      )}
    </div>
  );
};

App.propTypes = {};
