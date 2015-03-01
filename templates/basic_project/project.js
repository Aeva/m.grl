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
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("audio", "sounds/");
    please.set_search_path("gani", "keyframes/");
    
    // load shader sources
    please.load("simple.vert");
    please.load("simple.frag");

    // load our model files
    please.load("gavroche_hall.jta");
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var prog = please.glsl("default", "simple.vert", "simple.frag");
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    please.set_clear_color(0.0, 0.0, 0.0, 0.0);

    // store our scene & build the graph:
    var level_data = please.access("gavroche_hall.jta");

    // build the scene
    var graph = new please.SceneGraph();

    var level_node = level_data.instance();
    graph.add(level_node);

    // add a camera object
    var camera = window.camera = new please.CameraNode();
    camera.look_at = vec3.fromValues(0, 10, 2.5);
    camera.location = function () {
        return [0.0, -14.0, 6.0];
    };
    camera.fov = 57.29; // zoom out a bit
    
    // Add the camera to the scene graph
    graph.add(camera);

    // If the camera is not explicitely activated, then the scene
    // graph will attempt to pick one to use.  In this case we have
    // only one so it doesn't matter, BUT it is generally good
    // practice to explicitly activate the camera you want to use:
    camera.activate();

    // magic number
    var TARGET_HEIGHT = 512;

    // register a render passes with the scheduler
    please.pipeline.add(-1, "scale_window", function () {
        // automatically change the viewport if necessary 

        var window_w = window.innerWidth;
        var window_h = window.innerHeight;

        var ratio = window_w / window_h;
        var set_h = Math.min(TARGET_HEIGHT, window.innerHeight);
        var set_w = Math.round(set_h * ratio);
        
        var canvas_w = please.gl.canvas.width;
        var canvas_h = please.gl.canvas.height;
        if (set_w !== canvas_w || set_h !== canvas_h) {
            please.gl.canvas.width = set_w;
            please.gl.canvas.height = set_h;
            gl.viewport(0, 0, set_w, set_h);
        }
    });

    // register a render pass with the scheduler
    please.pipeline.add(10, "phone/draw", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //please.gl.get_program("default").activate();
        graph.draw();
    });
    
    please.pipeline.start();
}));
