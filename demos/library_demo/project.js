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
        "stage.jta",
        "floor.jta",
        "bg.png",
        "trees.png",

        "campfire.gani",
        "clock.gani",
        "coin.gani",
        "idle.gani",
        "walk.gani",
    ],

    "player_x" : 0,
};


addEventListener("load", function() {
    // Attach the opengl rendering context.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    please.set_clear_color(0.0, 0.0, 0.0, 1.0);

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
    var graph = demo.graph = new please.SceneGraph();
    var camera = demo.camera = new please.CameraNode();
    camera.look_at = [0.0, 1.0, 1.2];
    camera.location = [0.0, -0.5, 1.1];
    camera.fov = 60;
    graph.add(camera);
    
    var stage = demo.stage = please.access("stage.jta").instance();
    stage.propogate(function (node) { node.shader.mode = 0; });
    graph.add(stage);

    var floor = demo.floor = please.access("floor.jta").instance();
    floor.node_lookup["floor"].shader.mode = 1;
    graph.add(floor);

    // make the demo auto scroll
    demo.player_x = please.repeating_driver(0, 16, 15000);


    var add_char = function (ani, x, y, focused) {
        var entity = please.access(ani).instance(false);
        entity.propogate(function (node) { node.shader.mode = 3; });
        entity.rotation_x = 90;
        entity.scale = [.25, .25, .25];
        entity.location = [x, y, 0];
        if (!focused) {
            entity.location_x = function () {
                return (((demo.player_x+(x+8)) % 16) * -1 + 8);
            }
        }
        entity.dir = 3;
        graph.add(entity);
        return entity;
    };

    
    // add some stuff to the demo
    add_char("walk.gani", 0, 3, true);
    for (var i=0; i<16; i+=1) {
        var coin = add_char("coin.gani", i, Math.random()*3 + 1.5);
    }
    
    // Setup the rendering pipeline.
    please.pipeline.add_autoscale();
    please.pipeline.add(10, "project/draw", function () {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        prog.vars.uv_offset = demo.player_x;
        graph.draw();
    });
    please.pipeline.start();
}));
