

m.compositing.js
================

The compositing graph is a system for automating and simplifying
multipass rendering. A compositing node is an object that sates which
shader program should be used durring, what texture variables it may
set, and defines a function which contains the drawing code.

The texture properties of a compositing node may be either a URI string
denoting an image file, or it can be another compositing node instance.
In the later case, a texture will be generated automatically by
rendering the child node to a texture before rendering the parent.

The compositing graph is able to solve the correct order in which nodes
should be drawn, and so drawing a scene is a singular function call:

.. code-block:: javascript

    please.render(some_compositing_node);




please.RenderNode
-----------------
*please.RenderNode* **(shader\_program)**

This constructor function creates a compositing node. The
'shader\_program' argument is either the name of a compiled shader
program or a shader program object. RenderNodes have the following
properties and methods:

-  **shader** the shader object contains animatable bindings for all
   uniform variables defined by the provided shader. Sampler variables
   may be set as a URI string or another RenderNode object.

-  **graph** if this property is set to a graph node, the default render
   method will automatically draw this graph node.

-  **peek** may be null or a function that returns a graph node. This
   may be used to say that another render node should be rendered
   instead of this one.

-  **render** by default is a function that will call please.gl.splat if
   the graph property is null or will otherwise call graph.draw(). This
   function may be overridden to support custom drawing logic.


please.render
-------------
*please.render* **(node)**

Renders the compositing tree.


please.TransitionEffect
-----------------------
*please.TransitionEffect* **(shader\_program)**

TransitionEffect nodes are RenderNodes with some different defaults.
They are used to blend between two different RenderNodes.

TransitionEffects differ from RenderNodes in the following ways:

-  assumes the shader defines a float uniform named "progress"

-  assumes the shader defines a sampler uniform named "texture\_a"

-  assumes the shader defines a sampler uniform named "texture\_b"

-  the render method always calls please.gl.splat()

-  the peek method is defined so as to return one of the textures if
   shader.progress is either 0.0 or 1.0.

TransitionEffect nodes also define the following:

-  **reset\_to(texture)** sets shader.texture\_a to texture and
   shader.progress to 0.0.

-  **blend\_to(texture, time)** sets shader.texture\_b to texture, and
   shader.progress to a driver that blends from 0.0 to 1.0 over the
   provide number of miliseconds.

-  **blend\_between(texture\_a, texture\_b, time)** shorthand method for
   the above two functions.


