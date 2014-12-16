

m.graph.js
==========

This part of the module implements the scene graph functionality for
M.GRL. This provides a simple means of instancing 2D and 3D art assets,
greatly simplifies rendering code, and prerforms rendering optimizations
to have better performance than would be achieved with by rendering
manually.

Additionally, a mechanism for data binding exists on most of the
properties of graph objects. For example, you could set the object's "x"
coordinate to be a value like "10", or you could set it to be a function
that returns a numerical value like "10". This can be used to perform
animation tasks. When a function is assigned to a property in such a
fashion, it is called a "driver function".

Note that, being a scene graph, objects can be parented to other
objects. When the parent moves, the child moves with it! Empty graph
objects can be used to influence objects that draw. Between empties,
inheritance, and driver functions, you are given the tools to implement
animations without requiring vertex deformation.

Camera objects have a mechanism similar to driver functions, wherein
they can either take a coordinate tripple [1,2,3], a function that
returns a coordinate tripple, or a graph object.

.. code-block:: javascript

    // A scene graph instance
    var scene_graph = new please.SceneGraph();

    // A drawable graph node.  You can instance gani and image files, too!
    var character_model = please.access("alice.jta").instance();
    character_model.rotate_z = function () { return performance.now()/500; };

    // The focal point of the camera
    var camera_target = new please.GraphNode();
    camera_target.z = 2;

    // An empty that has the previous two graph nodes as its children
    // The game logic would move this node.
    var character_base = new please.GraphNode();

    // Populate the graph
    scene_graph.add(character_base);
    character_base.add(character_model);
    character_base.add(camera_target);

    // Add a camera object that automatically points at particular
    // graph node.
    var camera = new please.CameraNode();
    graph.add(camera);
    camera.look_at = camera_target;
    camera.x = 10;
    camera.y = -10;
    camera.z = 10;
    scene_graph.camera = camera; // this will not be needed in the future

    // Register a render pass with the scheduler (see m.multipass.js)
    please.pipeline.add(10, "graph_demo/draw", function () {
       gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

       // this line needs to be called once per frame, before drawing.
       scene_graph.tick();

       // this line may be called repeatedly to draw the current
       // snapshot of the graph multiple times the same way.
       scene_graph.draw();

    });

    // Register a second render pass that will also draw the scene_graph
    please.pipeline.add(20, "graph_demo/fancy", function () {

       // .tick() will have been called by the previous pipeline stage,
       // so you shouldn't call it again.  You can, however, call
       // .draw() as many times as you like per frame.  Both of these
       // pipeline stages are in the same "frame".  You can take
       // advantage of this to do post processing effects with the
       // stencil buffer, shaders, and/or indirect rendering targets!

       scene_graph.draw();

    });

    // Start the render loop
    please.pipeline.start();





please.GraphNode
----------------
*please.GraphNode* **()**

Constructor function that creates an Empty node. The constructor accepts
no arguments, but the created object may be configrued by adjusting its
properties. All properties that would have a numerical value normally
set to them may also be set as a function (called a "driver") that
returns a numerical value. When the scene graph's ".tick" method is
called, the driver functions are evaluated, and their results are cached
for use by the scene graph's .draw() method.

.. code-block:: javascript

    var empty = new please.GraphNode();
    var empty.rotate_x = 10;
    var empty.rotate_x = fuction() { return performance.now()/500; };

Most of the time when you want to draw something with the scene graph,
you create the GraphNodes indirectly from loaded game assets.

.. code-block:: javascript

    var character = please.access("alice.jta").instance();
    var sprite_animation = please.access("particle.gani").instance();
    var just_a_quad = please.access("hello_world.png").instance();

GraphNodes have some special properties:

-  **x**, **y**, **z** Used to generate the node's local matrix.

-  **rotate\_x**, **rotate\_y**, **rotate\_z** Used to generate the
   node's local matrix.

-  **scale\_x**, **scale\_y**, **scale\_z** Used to generate the node's
   local matrix.

-  **alpha** A numerical value between 0.0 and 1.0. If sort\_mode is set
   to "alpha", then this indicates alpha belnding value to be used by
   the GLSL shader, as accessible by the "alpha" uniform variable.
   Defaults to 1.0.

-  **visible** Defaults to true. May be set to false to prevent the node
   and its children from being drawn.

-  **priority** Defaults to 100. Determine the order in which all of the
   drivers are evaluated and cached. Set it lower if you want a node to
   be evaluated before other nodes.

-  **sort\_mode** Defaults to "solid", but may be set to "alpha" to
   force the object to use the z-sorting path instead of state sorting.
   This is generally slower, but is needed if for partial transparency
   from a texture to work correctly.

-  **draw\_type** .jta model instances and empty GraphNodes default to
   "model", while .gani and image instances default to "sprite".
   Determines the value of the glsl uniform variable "is\_transparent".

Additionally, each GraphNode has several objects used to set GLSL
variables:

-  **vars** - The property names on the *vars* object correspond to
   uniform variables on the shader program, and will be set
   automatically. The infrastructure that does this automatically
   prevents redundant state change calls so do not worry about that. The
   properties on the vars object may have driver methods assigned to
   them.

-  **ext** - Works exactly like vars, except it doesn't do anything to
   the GL state. Useful for storing custom data that might be referenced
   elsewhere.

-  **samplers** - The property names of the *samplers* object correspond
   to the sampler variables on the shader program, and will be set
   automatically. You simply assign them the uri of an image asset that
   was loaded by m.media's machinery, and you are good to go! M.GRL will
   take care of texture uploading automatically. This object also
   accepts driver methods.

Graph nodes have the following properties pertaining to object
inhertiance:

-  **children** This is a list of all objects that are directly parented
   to a given GraphNode instance.

-  **parent** To avoid a circular reference, this uses a trick involving
   a closure to create weakref and a 'getter' property to provide a
   cleaner means of access. This property may not be written to, and
   reads out either the last object to add this one as a child
   (including the scene graph instance itself), or returns null if the
   object believes itself to be unparented.

GraphNodes also have the following methods for managing the scene graph:

-  **has\_child(entity)** Returns true or false whether or not this node
   claims argument 'entity' as child.

-  **add(entity)** Adds the passed object as a child, and sets its
   parent weakref closure.

-  **remove(entity)** Remove the given entity from this node's children,
   and clear its parent weakref.

If you want to create your own special GraphNodes, be sure to set the
following variables in your constructor to ensure they are unique to
each instance.

.. code-block:: javascript

    var FancyNode = function () {
        console.assert(this !== window);
        please.GraphNode.call(this);
    };
    FancyNode.prototype = Object.create(please.GraphNode.prototype);

Should you desire not to call the constructor; at a minimum you really
only need to define in a derrived class this.ext, this.vars,
this.samplers, and this.children. Calling the GraphNode constructor will
accomplish this for you.

If you want to make an Empty or a derived constructor drawable, set the
"\_\_drawable" property to true, and set the "draw" property to a
function that contains your custom drawing code. Optionally, the "bind"
property may also be set to a function. Bind is called before Draw, and
is used to set up GL state. Bind is called regardless of if the node is
visible, though both bind and draw requrie the node be drawable. The
bind method is essentially vestigial and should not be used.


please.SceneGraph
-----------------
*please.SceneGraph* **()**

Constructor function that creates an instance of the scene graph. The
constructor accepts no arguments. To render, the **camera** property
must be set to a camera object. Currently this is limited to
please.PerspectiveCamera, though other types will be available in the
future.

The **.tick()** method on SceneGraph instances is called once per frame
(multiple render passes may occur per frame), and is responsible for
determining the world matricies for each object in the graph, caching
the newest values of driver functions, and performs state sorting.

The **.draw()** method is responsible for invoking the .draw() methods
of all of the nodes in the graph. State sorted nodes will be invoked in
the order determined by .tick, though the z-sorted nodes will need to be
sorted on every draw call. This method may called as many times as you
like per frame. Normally the usage of this will look something like the
following example:

.. code-block:: javascript

    please.pipeline.add(10, "graph_demo/draw", function () {
       gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
       scene_graph.tick();
       scene_graph.draw();
    });



please.CameraNode
-----------------
*please.CameraNode* **()**

Constructor function that creates a camera object to be put in the scene
graph. Camera nodes support both orthographic and perspective
projection, and almost all of their properties are animatable. The view
matrix can be generated in one of two ways described below.

To make a camera active, call it's "activate()" method. If no camera was
explicitly activated, then the scene graph will call the first one added
that is an immediate child, and if no such camera still exists, then it
will pick the first one it can find durring state sorting.

The default way in which the view matrix is calculated uses the
mat4.lookAt method from the glMatrix library. The following properties
provide the arguments for the library call. Note that the location
argument is missing - this is because the CameraNode's scene graph
coordinates are used instead.

-  **look\_at** A vector of 3 values (defaults to [0, 0, 0]), null, or
   another GraphNode. This is the coordinate where the camera is pointed
   at. If this is set to null, then the CameraNode's calculated world
   matrix is used as the view matrix.

-  **up\_vector** A normal vector of 3 values, indicating which way is
   up (defaults to [0, 0, 1]). If set to null, [0, 0, 1] will be used
   instead

If the look\_at property is set to null, the node's world matrix as
generated be the scene graph will be used as the view matrix instead.

One can change between orthographic and perspective projection by
calling one of the following methods:

-  **set\_perspective()**

-  **set\_orthographic()**

The following property influences how the projection matrix is generated
when the camera is in perspective mode (default behavior).

-  **fov** Field of view, defined in degrees. Defaults to 45.

The following properties influence how the projection matrix is
generated when the camera is in orthographic mode. When any of these are
set to 'null' (default behavior), the bottom left corner is (0, 0), and
the top right is (canvas\_width, canvas\_height).

-  **left**

-  **right**

-  **bottom**

-  **up**

The following properties influence how the projection matrix is
generated, and are common to both orthographic and perspective mode:

-  **width** Defaults to null, which indicates to use the rendering
   canvas's width instead. For perspective rendering, width and height
   are used to calculate the screen ratio. Orthographic rendering uses
   these to calculate the top right coordinate.

-  **height** Defaults to null, which indicates to use the rendering
   canvas's height instead. For perspective rendering, width and height
   are used to calculate the screen ratio. Orthographic rendering uses
   these to calculate the top right coordinate.

-  **near** Defaults to 0.1

-  **far** Defaults to 100.0




