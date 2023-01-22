import React from 'react';

export const NavBar = ({
  graph,
  setGraph
}: {
  graph: string;
  setGraph: React.Dispatch<React.SetStateAction<string>>;
}): JSX.Element => {
  return (
    <nav>
      <ul>
        <li>
          <button
            className={graph === 'sunburst' ? 'active' : ''}
            onClick={() => setGraph('sunburst')}
          >
            Display as Sunburst
          </button>
        </li>
        <li>
          <button className={graph === 'tree' ? 'active' : ''} onClick={() => setGraph('tree')}>
            Display as Tree
          </button>
        </li>
      </ul>
    </nav>
  );
};
