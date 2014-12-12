

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
    var camera = new please.PerspectiveCamera(canvas_element);
    camera.look_at = camera_target;
    camera.location = vec3.formValues(10, -10, 10);
    scene_graph.camera = camera;

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

-  *x*, *y*, *z* Used to generate the node's local matrix.

-  *rotate\_x*, *rotate\_y*, *rotate\_z* Used to generate the node's
   local matrix.

-  *scale\_x*, *scale\_y*, *scale\_z* Used to generate the node's local
   matrix.

-  *alpha* A numerical value between 0.0 and 1.0. Indicates alpha
   belnding value to be used by the GLSL shader. In the future, setting
   this to 1.0 will put it in the state-sorting draw path, and setting
   it less than 1.0 will put it in the z-sorting draw path. State
   sorting is more efficient, but z-sorting is needed to do alpha
   blending effects.

-  *visible* Defaults to true. May be set to false to prevent the node
   and its children from being drawn.

-  *priority* Defaults to 100. Determine the order in which all of the
   drivers are evaluated and cached. Set it lower if you want a node to
   be evaluated before other nodes.

-  *sort\_mode* DEPRECATED - defaults to "solid" to make the node state
   sorted, but may be set to "alpha" to put it in the z-sorting draw
   path.

-  *draw\_type* - defaults to "model" but may be set to "sprite". At the
   time of writing this doc, I am unsure if it is actually in use for
   anything. Might be deprecated.

-  *z\_bias* defaults to 0, unused, so might be deprecated.

Additionally, each GraphNode has several objects used to set GLSL
variables:

-  *vars* - The property names on the *vars* object correspond to
   uniform variables on the shader program, and will be set
   automatically. The infrastructure that does this automatically
   prevents redundant state change calls so do not worry about that. The
   properties on the vars object may have driver methods assigned to
   them.

-  *ext* - Works exactly like vars, except it doesn't do anything to the
   GL state. Useful for storing custom data that might be referenced
   elsewhere.

-  *samplers* - The property names of the *samplers* object correspond
   to the sampler variables on the shader program, and will be set
   automatically. You simply assign them the uri of an image asset that
   was loaded by m.media's machinery, and you are good to go! M.GRL will
   take care of texture uploading automatically. This object also
   accepts driver methods.

If you want to create your own special GraphNodes, be sure to set the
following variables in your constructor to ensure they are unique to
each instance.

.. code-block:: javascript

    var FancyNode = function () {
        this.children = [];
        this.ext = {};
        this.vars = {};
        this.samplers = {};
    };
    FancyNode.prototype = new please.GraphNode();

If you want to make an Empty or a derived constructor drawable, set the
"\_\_drawable" property to true, and set the "draw" property to a
function that contains your custom drawing code. Optionally, the "bind"
property may also be set to a function. Bind is called before Draw, and
is used to set up GL state. Bind is called regardless of if the node is
visible, though both bind and draw requrie the node be drawable. The
bind method is essentially vestigial and should not be used.


