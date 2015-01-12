"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file demonstrates loading a GLSL shader program, and M.GRL's
 feature for automatic binding of uniform variables.
.

 The javascript source code demos provided with M.GRL have been
 dedicated to the by way of CC0.  More information about CC0 is
 available here: https://creativecommons.org/publicdomain/zero/1.0/
.

 Art assets used are under a Creative Commons Attribution - Share
 Alike license or similar (this is explained in detail elsewhere).
 M.GRL itself is made available to you under the LGPL.  M.GRL makes
 use of the glMatrix library, which is some variety of BSD license.
.

 Have a nice day! ^_^

 */


var scene = {
    // points for the camera to focus on
    "f_points" : [
        [-6, 0, 4],
        [0, -6, 4],
        [6, 0, 4],
        [0, 6, 4],
    ],

    // positions for the camera
    "p_points" : [
        [-6, 19, 4.5],
        [-19, -6, 4.5],
        [6, -19, 4.5],
        [19, 6, 4.5],
    ],

    // which point set to use
    "stage" : 0,
};


window.change_focus = function(last_focus, next_focus) {
    console.info(" + changed focus to: " + next_focus + ", from: " + last_focus);

    if (scene.focus && scene.camera) {
        // read out current position
        var last_f = scene.focus.location;
        var last_p = scene.camera.location;

        // read out new targets
        var next = (scene.stage + 1) % scene.f_points.length;
        var next_f = scene.f_points[next];
        var next_p = scene.p_points[next];

        // set up new animations
        scene.focus.location = please.path_driver(
            please.linear_path(last_f, next_f), 1000, false, false);
        scene.camera.location = please.path_driver(
            please.linear_path(last_p, next_p), 1000, false, false);

        // change the stage counter
        scene.stage = next;
    }
};


window.addEventListener("load", function () {
    please.gl.set_context("bg_demo");
    please.set_search_path("glsl", "site_media/glsl");
    please.set_search_path("img", "demos/gl_assets/img/");
    please.set_search_path("jta", "demos/gl_assets/models/");
    please.load("demo.vert");
    please.load("demo.frag");

    please.load("suzanne.png");
    please.load("suzanne.jta");
});


addEventListener("mgrl_media_ready", function () {
    // build the shader program
    var vert = please.access("demo.vert");
    var frag = please.access("demo.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // enable alpha blending
    gl.enable(gl.BLEND);
    //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // scene graph object thingy
    var graph = scene.graph = new please.SceneGraph();
    graph.add(new FloorNode());

    // access model data
    var noun = scene.noun = please.access("suzanne.jta").instance();
    noun.shader.mode = 2;
    noun.scale = [4, 4, 4];
    noun.rotation_x = 115;
    noun.rotation_y = 180;
    noun.rotation_z = -20;
    noun.location_x = 2;
    noun.location_z = -2;
    graph.add(noun);

    var focus = scene.focus = new please.GraphNode();
    graph.add(focus);
    focus.location = scene.f_points[scene.stage];

    // add a camera
    var camera = scene.camera = new please.CameraNode();
    camera.look_at = focus;
    camera.location = scene.p_points[scene.stage];
    camera.fov = 45;
    graph.add(camera);
    camera.activate();

    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);
    
    // register a render passes with the scheduler
    please.pipeline.add(1, "scale_window", function () {
        var window_w = window.innerWidth;
        var window_h = window.innerHeight;
        var canvas_w = please.gl.canvas.width;
        var canvas_h = please.gl.canvas.height;
        if (window_w !== canvas_w || window_h !== canvas_h) {
            please.gl.canvas.width = window_w;
            please.gl.canvas.height = window_h;
            gl.viewport(0, 0, window_w, window_h);
        }
    });
    please.pipeline.add(10, "demo_06/draw", function () {
        // -- update uniforms
        prog.vars.time = performance.now();
        prog.vars.light_direction = light_direction;

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        graph.draw();
    });

    // start the draw loop
    please.pipeline.start();
});


var FloorNode = function () {
    console.assert(this !== window);
    please.GraphNode.call(this);

    this.__vbo = please.gl.make_quad(100, 100);
    this.__drawable = true;
    this.shader.mode = 1; // "floor mode"

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
FloorNode.prototype = please.GraphNode.prototype;