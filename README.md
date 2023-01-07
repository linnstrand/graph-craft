# Learning D3.js with React

## Notes

### Learning resources

[Amelia Wattenberger - React and D3](https://wattenberger.com/blog/react-and-d3)

> - Use React refs as sparingly as possible.
> - _Declarative instead of imperative_:
>   The code describes what is being drawn, instead of how to draw it.
> - _Less code_:
>   Our second Circle component has fewer than two-thirds the number of lines as our first iteration/
> - _Less hacky_:
>   React is, chiefly, a rendering library, and has many optimizations to keep our web apps performant. When adding elements using d3, we're hacking around React, and essentially have to fight against those optimizations. Hacking around your JS framework is a recipe for future frustration, especially if the framework's API changes.

This means we should avoid adding nodes via D3, and use D3 to change!
