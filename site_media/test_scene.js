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
        [-4, 0, 4],
        [0, -4, 4],
        [4, 0, 4],
        [0, 4, 4],
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

    //
    "buffer_control" : {
        "width" : 1024,
        "height" : 512,
    },
};


window.change_focus = function(last_focus, next_focus) {
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
    // setup drawing context
    please.gl.set_context("bg_demo");

    // set up media search paths
    please.set_search_path("glsl", "site_media/glsl");
    please.set_search_path("img", "demos/gl_assets/img/");
    please.set_search_path("jta", "demos/gl_assets/models/");

    // shader sources
    please.load("demo.vert");
    please.load("demo.frag");
    please.load("depth.vert");
    please.load("depth.frag");
    please.load("splat.vert");
    please.load("bokeh.frag");
    please.load("upsample.frag");

    // model data to draw
    please.load("suzanne.png");
    please.load("suzanne.jta");
    please.load("floor_lamp.jta");
});


addEventListener("mgrl_media_ready", function () {
    // build the shader program
    var build_shader = function(name, vert_file, frag_file) {
        var vert = please.access(vert_file);
        var frag = please.access(frag_file);
        return please.glsl(name, vert, frag);
    };
    var prog = build_shader("default", "demo.vert", "demo.frag");
    prog.activate();

    build_shader("depth", "depth.vert", "depth.frag");
    build_shader("bokeh", "splat.vert", "bokeh.frag");
    build_shader("upsample", "splat.vert", "upsample.frag");

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    //gl.enable(gl.CULL_FACE);
    gl.disable(gl.CULL_FACE);

    please.set_clear_color(.93, .93, .93, 1.0);

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
    noun.rotation_x = 63;
    noun.rotation_y = 18;
    noun.rotation_z = 171;
    noun.location_x = 2;
    noun.location_z = -2;
    graph.add(noun);

    var block, block_model = please.access("floor_lamp.jta");
    var stamp = function (x, y) {
        block = block_model.instance();
        block.shader.mode = 2;
        block.location = [x, y, 0];
        block.scale = [.5, .5, .5];
        graph.add(block);
    };

    var steps = 8;
    var dist = 10;
    var offset = 5;
    for (var angle=0; angle<360.0; angle += 360/steps) {
        var x = Math.cos(please.radians(angle+offset)) * dist;
        var y = Math.sin(please.radians(angle+offset)) * dist;
        stamp(x,y);
    }
    
    var focus = scene.focus = new please.GraphNode();
    graph.add(focus);
    focus.location = scene.f_points[scene.stage];

    // add a camera
    var camera = scene.camera = new please.CameraNode();
    camera.look_at = focus;
    camera.location = scene.p_points[scene.stage];
    camera.fov = 45;

    camera.depth_of_field = 4;
    camera.depth_falloff = 10;

    graph.add(camera);
    camera.activate();

    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);

    
    // register a render passes with the scheduler
    please.pipeline.add(1, "scale_window", function () {
        // automatically change the viewport if necessary 

        var window_w = window.innerWidth;
        var window_h = window.innerHeight;
        var canvas_w = please.gl.canvas.width;
        var canvas_h = please.gl.canvas.height;
        if (window_w !== canvas_w || window_h !== canvas_h) {
            please.gl.canvas.width = window_w;
            please.gl.canvas.height = window_h;
        }
    });


    please.pipeline.add(10, "test/depth_pass", function () {
        // write out blur factor information based on depth

        var prog = please.gl.get_program("depth");
        prog.activate();

        prog.vars.bg_fill = true;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        please.gl.splat();

        prog.vars.bg_fill = false;
        gl.clear(gl.DEPTH_BUFFER_BIT);
        graph.draw();
    }).as_texture(scene.buffer_control);


    please.pipeline.add(20, "demo_06/draw", function () {
        // draw the scene normally

        var prog = please.gl.get_program("default");
        prog.activate();

        // -- update uniforms
        prog.vars.light_direction = light_direction;

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        graph.draw();
    }).as_texture(scene.buffer_control);


    please.pipeline.add(30, "test/bokeh_pass", function () {
        // selectively blur the scene

        var prog = please.gl.get_program("bokeh");
        prog.activate();

        // update uniforms, etc
        prog.samplers.depth_pass = "test/depth_pass";
        prog.samplers.color_pass = "demo_06/draw";

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        please.gl.splat();
    }).as_texture(scene.buffer_control);


    please.pipeline.add(40, "test/upsample_pass", function () {
        // upsample the frame buffer

        var prog = please.gl.get_program("upsample");
        prog.activate();
        prog.samplers.color_pass = "test/bokeh_pass";
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        please.gl.splat();
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

    window.addEventListener("mgrl_changed_shader", function (event) {
        this.shader.mode = 1;
    }.bind(this));

    this.bind = function () {
        this.__vbo.bind();
    };
    this.draw = function () {
        this.__vbo.draw();
    };
};
FloorNode.prototype = please.GraphNode.prototype;
