

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

-  **rotation** Animatable tripple, define's the object's rotation in
   euler notation.

-  **world\_location** Read only getter which provides a the object's
   coordinates in world space.

-  **quaternion** Animatable tripple, by default, it is a getter that
   returns the quaternion for the rotation defined on the 'rotation'
   property. If you set this, the 'rotation' property will be
   overwritten with a getter, which currently returns an error. This is
   useful if you need to define something's orientation without
   suffering from gimbal lock. Behind the scenes, m.grl reads from this
   property, not from rotation.

-  **scale** Animatable tripple, used to generate the node's local
   matrix.

-  **shader** An object, automatically contains bindings for most GLSL
   shader variables. Variables with non-zero defaults are be listed
   below.

-  **selectable** Defaults to false. May be set to true to allow the
   object to be considered for picking.

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
**While .tick() may be called manually, it is nolonger required as the
draw call will do it automatically**.

The **.draw()** method is responsible for invoking the .draw() methods
of all of the nodes in the graph. State sorted nodes will be invoked in
the order determined by .tick, though the z-sorted nodes will need to be
sorted on every draw call. This method may called as many times as you
like per frame. Normally the usage of this will look something like the
following example:


