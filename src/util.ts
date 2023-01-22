import * as d3 from 'd3';
export interface Data {
  name: string;
  value?: number;
  target?: Partial<d3.HierarchyRectangularNode<Data>>;
  current?: d3.HierarchyRectangularNode<Data>;
  children?: Data[];
}

export const sortValue = (root: d3.HierarchyNode<Data>) =>
  root.sum((d) => d.value).sort((a, b) => d3.descending(a.height, b.height));

export const sortHeight = (root: d3.HierarchyNode<Data>) =>
  root.sum((d) => d.value).sort((a, b) => b.value - a.value);
