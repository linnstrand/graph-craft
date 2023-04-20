# Learning D3.js with React

This exercise demonstrates use of D3 for use in displaying hierarchical data in different ways.

Page: https://linnstrand.github.io/graph-craft/ Sunburts and Tree.

## Interactive Sunburst Chart

A Sunburst Chart consists of an inner circle surrounded by rings of deeper hierarchy levels.
Each level of the hierarchy is represented by one ring or circle with the innermost circle as the top of the hierarchy.
It's helpful to display multi-level data. In this case, there was too many levels to display at once, so only the top 3 levels are shown.

The user can click a slice to re-center and show deeper levels. Clicking the center zooms out.

## Tree Charts

The tree chart can be displayed in 3 ways, tree, radial and cluster.
The colors and hover effect are made to show range of D3 rather then be the best way to display the data.

## Notes

Some functions are moved to an utils file to make component code easier to read.

### Learning resources

[D3js](https://d3js.org/)

[Amelia Wattenberger - React and D3](https://wattenberger.com/blog/react-and-d3)

[D3 Graph Gallery](https://d3-graph-gallery.com/index.html)

[Observable D3](https://observablehq.com/@d3)
