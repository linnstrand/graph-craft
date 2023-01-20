import testdata from './testdata.json';
import { Tree } from './Tree';
import { Graph } from './Graph';
import { useState } from 'react';

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
      <nav>
        <ul>
          <li>
            <button
              className={graph === 'sunburst' ? 'active' : ''}
              onClick={() => setGraph('sunburst')}
            >
              Sunburst
            </button>
          </li>
          <li>
            <button className={graph === 'tree' ? 'active' : ''} onClick={() => setGraph('tree')}>
              Tree
            </button>
          </li>
        </ul>
      </nav>
      {graph === 'sunburst' ? (
        <Graph data={{ ...testdata }} size={750} />
      ) : (
        <Tree data={{ ...testdata }} size={940} />
      )}
    </div>
  );
};

App.propTypes = {};
