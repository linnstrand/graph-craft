import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Graph } from './Graph';
import testdata from './testdata.json';

function App() {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (data) return;
    const readData = async () => {
      const response = await fetch('testdata.csv');
      const reader = response.body.getReader();
      const result = await reader.read();
      const decoder = new TextDecoder('utf-8');
      const csv = await decoder.decode(result.value);
      const table = d3.csvParse(csv);
      setData(table);
      return table;
    };
    readData();
  }, []);

  return <div className="App">{<Graph data={testdata} />}</div>;
}

export default App;
