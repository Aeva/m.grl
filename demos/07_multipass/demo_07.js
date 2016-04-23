"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file demonstrates multipass rendering in M.GRL
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


addEventListener("load", function() {
    // create the rendering context
    please.gl.set_context("gl_canvas");

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    please.set_clear_color(0.0, 0.0, 0.0, 0.0);

    // setup asset search paths
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");

    // load assets
    please.load("halftone.vert");
    please.load("halftone.frag");
    please.load("suzanne.jta");

    // add a loading screen
    please.set_viewport(new please.LoadingScreen());
});


var key_times = {
    "up" : false,
    "left" : false,
    "down" : false,
    "right" : false,
};

var position_mod = [0, 0, 0];


function key_handler(state, key) {
    // arrow key handler
    if (state === "cancel") {
        key_times[key] = false;
    }
    else if (state === "press" && key_times[key] === false) {
        key_times[key] = performance.now();
    }
};


function get_key_times(cap) {
    // returns how long a key has been pressed
    var times = {};
    var mark = performance.now();

    var names = please.get_properties(key_times);
    for (var i=0; i<names.length; i+=1) {
        var name = names[i];
        times[name] = 0;
        if (key_times[name] !== false) {
            var dt = (mark - key_times[name]);
            if (cap && cap < dt) {
                times[name] = cap;
            }
            else {
                times[name] = dt;
            }
        }
    }
    return times;
};


function get_camera_position() {
    var rest = vec3.fromValues(0, -4, 2);
    var times = get_key_times(10000.0);

    // determine X mod
    if (times.left) {
        position_mod[0] = times.left * -1;
    }
    else if (times.right) {
        position_mod[0] = times.right;
    }
    else {
        position_mod[0] /= 2.0;
    }

    // determine Z mod
    if (times.up) {
        position_mod[2] = times.up;
    }
    else if (times.down) {
        position_mod[2] = times.down * -1;
    }
    else {
        position_mod[2] /= 1.1;
    }

    for (var i=0; i<3; i+=1) {
        rest[i] += position_mod[i]/100;
    }

    return rest;
};


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // build the GLSL shader program
    var prog = please.glsl("custom", "halftone.vert", "halftone.frag");
    prog.activate();

    // create the scene graph root
    var graph = new please.SceneGraph();

    // lighting stuff
    var light_direction = vec3.fromValues(-1.0, 1.0, 0.0);
    vec3.scale(light_direction, light_direction, -1);
    vec3.normalize(light_direction, light_direction);

    // create the first render pass
    var basic_draw = new please.RenderNode("custom");
    basic_draw.clear_color = [0.0, 0.0, 0.0, 0.0];
    basic_draw.shader.light_direction = light_direction;
    basic_draw.shader.draw_pass = 1;
    basic_draw.graph = graph;

    // create the final render pass
    var post_process = new please.RenderNode("custom");
    post_process.shader.previous_render = basic_draw;
    post_process.shader.draw_pass = 2;
    please.set_viewport(post_process);

    // connect keyboard stuff
    please.keys.enable();
    please.keys.connect("up", key_handler);
    please.keys.connect("left", key_handler);
    please.keys.connect("down", key_handler);
    please.keys.connect("right", key_handler);

    // add model
    var suzanne_data = please.access("suzanne.jta");
    var rotation_speed = .0005;

    // build the scene graph
    var suzanne = suzanne_data.instance();
    suzanne.rotation_z = function () {
        var progress = performance.now()/110;
        return progress*-1;
    };
    graph.add(suzanne);

    // setup camera_a
    var camera = new please.CameraNode();
    graph.add(camera);
    camera.look_at = [0, 0, 1];
    camera.location = get_camera_position;
}));
