

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

Inherits from please.CameraNode and can be used similarly. This camera
defines two subcameras, accessible from the properties "left\_eye" and
"right\_eye". Their position is determined by this object's
"eye\_distance" property, which should correspond to millimeters
(defaults to 62). The "unit\_conversion" property is a multiplier value,
and you use it to define what "millimeters" means to you.

Ideally, the StereoCamera object should be the object that you orient to
change the viewpoint of both cameras, and that the sub cameras
themselves are what is activated for the purpose of saving color
buffers. A simple pipeline can be constructed from this to

If the StereoCamera's "look\_at" value is set to something other than
[null, null, null], the child CameraNode objects will automatically
attempt to converge on the point. If it is desired that they not
converge, set the StereoCamera's "auto\_converge" parameter to false.
When auto convergance is left on, objects that are past the focal point
will appear to be "within" the screen, whereas objects in front of the
focal point will appear to "pop out" of the screen. If the focal point
is too close to the camera, you will see a cross eye effect. **Important
accessibility note**, Take care that camera.focal\_distance never gets
too low, or you can cause uneccesary eye strain on your viewer and make
your program inaccessible to users with convergence insufficiency.

Further usage:

.. code-block:: javascript

    var camera = new please.StereoCamera();

    // ...

    please.pipeline.add(10, "vr/left_eye", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        camera.left.activate();
        graph.draw();
    }).as_texture({width: 1024, height: 1024});

    please.pipeline.add(10, "vr/right_eye", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        camera.right.activate();
        graph.draw();
    }).as_texture({width: 1024, height: 1024});

    please.pipeline.add(20, "vr/display", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        prog.samplers.left_eye = "vr/left_eye";
        prog.samplers.right_eye = "vr/right_eye";
        prog.vars.mode = 1.0; // to indicate between color split & other modes
        please.gl.splat();
    });



