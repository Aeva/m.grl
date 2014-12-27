

m.graph.js
==========

This part of the module implements the scene graph functionality for
M.GRL. This provides a simple means of instancing 2D and 3D art assets,
greatly simplifies rendering code, and prerforms rendering optimizations
to have better performance than would be achieved with by rendering
manually.

Additionally, a mechanism for data binding exists on most of the
properties of graph objects. For example, you could set the object's
"location\_x" coordinate to be a value like "10", or you could set it to
be a function that returns a numerical value like "10". This can be used
to perform animation tasks. When a function is assigned to a property in
such a fashion, it is called a "driver function".

Note that, being a scene graph, objects can be parented to other
objects. When the parent moves, the child moves with it! Empty graph
objects can be used to influence objects that draw. Between empties,
inheritance, and driver functions, you are given the tools to implement
animations without requiring vertex deformation.

Some properties on graph nodes can be accessed either as an array or as
individual channels. Node.location = [x,y,z] can be used to set a driver
function for all three channels at once. The individual channels can be
accessed, set, or assigned their own driver methods via .location\_x,
.location\_y, and .location\_z. Currently, .location, .rotation, and
.scale work like this on all graph nodes. CameraNodes also have
.look\_at and .up\_vector. In the future, all vec3 uniform variables
will be accessible in this way. If a GraphNode-descended object is
assigned to a "tripple" handle, such as the example of look\_at in the
code above, then a driver function will be automatically created to wrap
the object's "location" property. Note, you should avoid setting
individual channels via the array handle - don **not** do ".location[0]
= num"!

Word of caution: driver functions are only called if the scene graph
thinks it needs them for rendering! The way this is determined, is that
driver functions associated to glsl variables are always evaluated. If
such a driver function attempts to read from another driver function,
then that driver is evaluated (and cached, so the value doesn't change
again this frame), and so on.

.. code-block:: javascript

    // A scene graph instance
    var scene_graph = new please.SceneGraph();

    // A drawable graph node.  You can instance gani and image files, too!
    var character_model = please.access("alice.jta").instance();
    character_model.rotation_z = function () { return performance.now()/100; };

    // The focal point of the camera
    var camera_target = new please.GraphNode();
    camera_target.location_z = 2;

    // An empty that has the previous two graph nodes as its children
    // The game logic would move this node.
    var character_base = new please.GraphNode();

    // Populate the graph
    scene_graph.add(character_base);
    character_base.add(character_model);
    character_base.add(camera_target);

    // Add a camera object that automatically points at particular
    // graph node.  If is more than one camera in the graph, then you
    // will need to explicitly call the camera's "activate" method to
    // have predictable behavior.
    var camera = new please.CameraNode();
    graph.add(camera);
    camera.look_at = camera_target;
    camera.location = [10, -10, 10];

    // Register a render pass with the scheduler (see m.multipass.js)
    please.pipeline.add(10, "graph_demo/draw", function () {
       gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

       // This line needs to be called once per frame, before drawing.
       // I hope to remove the need for this, and make it implicit
       // before the 1.0 release.
       scene_graph.tick();

       // This line may be called repeatedly to draw the current
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





please.make_animatable
----------------------
*please.make\_animatable* **(obj, prop, default\_value, proxy, lock)**

Sets up the machinery needed to make the given property on an object
animatable.


please.make_animatable_tripple
------------------------------
*please.make\_animatable\_tripple* **(object, prop, swizzle,
default\_value, proxy);**

Makes property 'prop' an animatable tripple / vec3 / array with three
items. Parameter 'object' determines where the cache lives, the value of
'this' passed to driver functions, and if proxy is unset, this also
determines where the animatable property is written. The 'prop' argument
is the name of the property to be animatable (eg 'location'). Swizzle is
an optional string of three elements that determines the channel names
(eg, 'xyz' to produce location\_x, location\_y, and location\_z). The
'initial' argument determines what the property should be set to, and
'proxy' determines an alternate object for which the properties are
written to.

As mentioned above, if an animatable tripple is passed a GraphNode, then
an implicit driver function will be generated such that it returns the
'location' property of the GraphNode.

If the main handle (eg 'location') is assigned a driver function, then
the swizzle handles (eg, 'location\_x') will stop functioning as setters
until the main handle is cleared. You can still assign values to the
channels, and they will appear when the main handle's driver function is
removed. To clear the main handle's driver function, set it to null.


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
    var empty.rotation.x = 10;
    var empty.rotation.x = fuction() { return performance.now()/100; };

Most of the time when you want to draw something with the scene graph,
you create the GraphNodes indirectly from loaded game assets.

.. code-block:: javascript

    var character = please.access("alice.jta").instance();
    var sprite_animation = please.access("particle.gani").instance();
    var just_a_quad = please.access("hello_world.png").instance();

GraphNodes have some special properties:

-  **location** Animatable tripple, used to generate the node's local
   matrix.

-  **rotation** Animatable tripple, used to generate the node's local
   matrix.

-  **scale** Animatable tripple, used to generate the node's local
   matrix.

-  **shader** An object, automatically contains bindings for most GLSL
   shader variables. Variables with non-zero defaults are be listed
   below.

-  **visible** Defaults to true. May be set to false to prevent the node
   and its children from being drawn.

-  **sort\_mode** Defaults to "solid", but may be set to "alpha" to
   force the object to use the z-sorting path instead of state sorting.
   This is generally slower, but is needed if for partial transparency
   from a texture to work correctly.

-  **draw\_type** .jta model instances and empty GraphNodes default to
   "model", while .gani and image instances default to "sprite".
   Determines the value of the glsl uniform variable "is\_transparent".

Additionally, each GraphNode has a "shader" property, which is an object
containing additional animatable properties for automatically setting
GLSL shader variables when it is drawn. The following variables have
non-zero defaults.

-  **shader.alpha** Animatable scalar - a numerical value between 0.0
   and 1.0. Defaults to 1.0.

-  **shader.world\_matrix** "Locked" animatable variable which by
   default contains a driver method that calculate's the object's world
   matrix for this frame by calculating it's world matrix from the
   location, rotation, and scale properties, and then multiplying it
   against either the parent's world matrix if applicable (or the
   identity matrix if not) to produce the object's own world matrix.

-  **shader.normal\_matrix** "Locked" animatable variable which
   calculates the normal\_matrix from shader.world\_matrix.

-  **is\_sprite** "Locked" animatable scalar value. Returns true if
   this.draw\_type is set to "sprite", otherwise returns false.

-  **is\_transparent** "Locked" animatable scalar value. Returns true if
   this.sort\_mode is set to "alpha", otherwise returns false.

Graph nodes have the following getters for accessing graph inhertiance.
You should avoid saving the vaules returned by these anywhere, as you
can prevent objects from being garbage collected or accidentally create
a reference cycle.

-  **children** This is a list of all objects that are directly parented
   to a given GraphNode instance.

-  **parent** This returns either null or the object for which this node
   is parented to.

-  **graph\_root** Returns the GraphNode that is the root of the graph.
   This should be either a SceneGraph instance or a derivative thereof.

GraphNodes also have the following methods for managing the scene graph:

-  **has\_child(entity)** Returns true or false whether or not this node
   claims argument 'entity' as child.

-  **add(entity)** Adds the passed object as a child.

-  **remove(entity)** Remove the given entity from this node's children.

-  **destroy()** Remove the object from it's parent, and then removes
   the reference to it from the node index.

If you want to create your own special GraphNodes, be sure to set the
following variables in your constructor to ensure they are unique to
each instance.

.. code-block:: javascript

    var FancyNode = function () {
        please.GraphNode.call(this);
    };
    FancyNode.prototype = Object.create(please.GraphNode.prototype);

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
constructor accepts no arguments. The graph must contain at least one
camera to be renderable. See CameraNode docstring for more details.

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




