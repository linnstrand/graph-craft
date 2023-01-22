import testdata from './testdata.json';
import { Tree } from './Tree';
import { Sunburst } from './Sunburst';
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
        <Sunburst data={{ ...testdata }} size={940} />
      ) : (
        <Tree data={{ ...testdata }} size={940} />
      )}
    </div>
  );
};

App.propTypes = {};
