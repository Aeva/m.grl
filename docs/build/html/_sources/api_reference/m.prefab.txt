

m.prefab.js
===========

please.pipeline.add_autoscale
-----------------------------
*please.pipeline.add\_autoscale* **(max\_height)**

Use this to add a pipeline stage which, when the rendering canvas has
the "fullscreen" class, will automatically scale the canvas to conform
to the window's screen ratio, making the assumption that css is then
used to scale up the canvas element. The optional 'max\_height' value
can be passed to determine what the maximum height of the element may
be. This defaults to 512, though a power of two is not required.

One can override the max\_height option by setting the "max\_height"
attribute on the canvas object.


please.LoadingScreen
--------------------
*please.LoadingScreen* **()**

Creates a simple loading screen placeholder RenderNode.

In the future, this will be animated to show the progress of pending
assets.


