import * as d3 from "d3";

export interface BaseData {
  name: string;
  value?: number;
  children?: BaseData[];
}

export interface Data extends BaseData {
  value: number;
  children?: Data[];
  color: string;
}

export interface GraphParams {
  data: Data;
  size: number;
  colorSetter: d3.ScaleOrdinal<string, string, never>;
}

export const sortByValue = (root: d3.HierarchyNode<Data>) =>
  root.sum((d) => d.value || 0).sort((a, b) => (b.value || 0) - (a.value || 0));

// height is the node distance from root
export const sortByHeight = (root: d3.HierarchyNode<Data>) =>
  root.sort((a, b) => d3.descending(a.height, b.height));

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
export const getDiscreteColors = (branches: number) =>
  d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, branches));
