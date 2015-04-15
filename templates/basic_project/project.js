"use strict";
/*

 Midnight Graphics & Recreation Library Project Template

 This javascript source file has been dedicated to the public domain
 by way of CC0.  More information about CC0 is available here:
 https://creativecommons.org/publicdomain/zero/1.0/ .

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).

 M.GRL itself is made available to you under the LGPL.

 M.GRL makes use of the glMatrix library, which is some variety of BSD
 license.

 Have a nice day! ^_^

 */


addEventListener("load", function() {
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // Set the clear color for the gl canvas.  Using this metho
    // instead of opengl's allows for the clear color to be accessible
    // in the shader, should it be defined as a uniform.  This also
    // allows for databinding the clear color.
    please.set_clear_color(0.0, 0.0, 0.0, 0.0);

    // Set OpenGL rendering state defaults directly.  Some of this may
    // be abstracted by m.grl in the future.
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("gani", "ganis/");
    please.set_search_path("audio", "sounds/");
    
    // Queue up assets to be downloaded before the game starts.
    please.load("simple.vert");
    please.load("diffuse.frag");
    please.load("gavroche_hall.jta");
});


addEventListener("mgrl_fps", function (event) {
    // This handler is called every so often to report an estimation
    // of the current frame rate, so that it can be displayed to the
    // user.
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // The "mgrl_media_ready" event is called when pending downloads
    // have finished.  As we are using this to initialize and start
    // the game, the callback is wrapped in the "please.once"
    // function, to ensure that it is only called once.
    
    // Create GL context, build shader pair
    var prog = please.glsl("default", "simple.vert", "diffuse.frag");
    prog.activate();
        
    // initialize a scene graph object
    var graph = new please.SceneGraph();

    // add our model to the scene graph
    var model = please.access("gavroche_hall.jta").instance();
    graph.add(model);
    
    // add a camera object to the scene graph
    var camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 5.0];
    camera.location = [0.0, -14.0, 8.0];
    graph.add(camera);

    // If the camera is not explicitely activated, then the scene
    // graph will attempt to pick one to use.  In this case we have
    // only one so it doesn't matter, BUT it is generally good
    // practice to explicitly activate the camera you want to use:
    camera.activate();

    // Register a render passes with the scheduler.  The autoscale
    // prefab is used to change the dimensions of the rendering canvas
    // when it has the 'fullscreen' css class, as well as constrain
    // the maximum height of said canvas element.  You are responsible
    // for providing the css needed to upsample the canvas, though
    // this project template accomplishes that for you.  See "ui.css".
    please.pipeline.add_autoscale();

    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        graph.draw();
    });

    // start the rendering pipeline
    please.pipeline.start();
}));
