import * as d3 from 'd3';
export interface Data {
  name: string;
  value?: number;
  target?: Partial<d3.HierarchyRectangularNode<Data>>;
  current?: d3.HierarchyRectangularNode<Data>;
  children?: Data[];
  color?: string;
}

export const brighter = (color) => d3.rgb(color).brighter(2).formatRgb();

export const sortHeight = (root: d3.HierarchyNode<Data>) =>
  root.sum((d) => d.value).sort((a, b) => b.value - a.value);

export const addColor = (treeLayout: d3.TreeLayout<Data>, data: Data) => {
  const color = getColor(data.children.length + 1);
  const r = treeLayout(d3.hierarchy(data)).sort((a, b) => d3.descending(a.height, b.height)); // set x/y

  const setBranchColor = (d, branchColor) => {
    d.data.color = branchColor;
    if (!d.children) return;
    d.children.forEach((c) => setBranchColor(c, branchColor));
  };

  r.children.forEach((d) => setBranchColor(d, color(d.data.name)));
  return r;
};
// COLOR!
// ordinal scales have a discrete domain and range
// quantize: Quantize scales are similar to linear scales, except they use a discrete rather than continuous range. Returns uniformly-spaced samples from the specified interpolator

// interpolateRainbow: Cyclical. (interpolateSinebow is an alternative)
// Given a number t in the range [0,1], returns the corresponding color from d3.interpolateWarm scale from [0.0, 0.5] followed by the d3.interpolateCool scale from [0.5, 1.0],
// thus implementing the cyclical less-angry rainbow color scheme.

/**
 *
 * @param branches The number of colors for the rainbow
 * @returns
 */
export const getColor = (branches: number) =>
  d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, branches));
