

m.prefab.js
===========

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



