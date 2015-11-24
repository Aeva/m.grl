

m.lights.js
===========

M.GRL provides a (work-in-progress and very much unstable) system for
applying light and shadow to a scene, via the compositing graph. This
system currently makes use of a deferred rendering system, and requires
several opengl extensions to be able to run correctly. Hopefully in the
near future, there will also be a fallback mode for when extensions are
missing, but that is not the case right now. Use with caution.




please.SpotLightNode
--------------------
*please.SpotLightNode* **(options)**

This constructor function creates a graph node which represents a spot
light. This object also creates a render node used for calculating
shadows. The buffer settings for this render node can be configured by
passing them as an object in the "options" argument. Most likely, this
would be to change the size of the light texture. The "options" argument
may be omitted.


please.DeferredRenderer
-----------------------
*please.DeferredRenderer* **()**

Creates a RenderNode encapsulating the deferred rendering functionality.
This api is experimental, so expect it to change dramatically until it
is stabilized.


