

m.staticdraw.js
===============

This part of M.GRL implements the StaticDrawNode functionality. Static
nodes are used to freeze instanced assets into a singular object which
can be drawn with only a few GL calls and no special processing.

Where GraphNodes are useful for applying dynamic behavior to a small
number of objects, StaticDrawNodes are intended to allow large numbers
of objects to be rendered as quickly as possible.




