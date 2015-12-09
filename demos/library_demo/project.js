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


window.demo = {
    "manifest" : [
        "chess.frag",
        "basic.frag",
        
        
    ],

    "player_x" : 0,
};


addEventListener("load", function() {
    // Attach the opengl rendering context.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // Add search paths for asset types.
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("gani", "ganis/");

    // Add the assets defined in the manifest to the load queue);
    demo.manifest.map(please.load);

    // Make "player_x" animatable.
    please.make_animatable(demo, "player_x", 0);
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Create GL context, build shader pair.
    var prog = please.glsl("default", "simple.vert", "basic.frag");
    prog.activate();
        
    // Setup the scene to be rendered.
    var graph = new please.SceneGraph();
    var camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 5.0];
    camera.location = [0.0, -14.0, 8.0];
    graph.add(camera);


    
    // var model = please.access("gavroche_hall.jta").instance();
    // graph.add(model);


    
    // Setup the rendering pipeline.
    please.pipeline.add_autoscale();
    please.pipeline.add(10, "project/draw", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        graph.draw();
    });
    please.pipeline.start();
}));
