

m.camera.js
===========

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


please.StereoCamera
-------------------
*please.StereoCamera* **()**

A StereoCamera is a special kind of CameraNode that can be used for
stereoscopic rendering. It creates two virtual cameras that are offset
slightly to the left and right of the parent camera. Scenes rendered
with either virtual camera can then be composited together to create a
stereoscopic effect.

This object has the following additional properties in addition to the
normal CameraNode properties:

-  **eye\_distance** This is the interpupillary distance (the distance
   the center of the pupils in both eyes). By default this is 62.3 mm.

-  **unit\_conversion** This is a multiplier to convert from millimeters
   to the arbitrary spatial units of your game. By default, this is
   value is 0.001 to convert to meters.


