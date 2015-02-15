

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

Further usage:

.. code-block:: javascript

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



