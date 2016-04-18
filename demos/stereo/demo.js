"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file is the old model loader demo, and will soon be superseeded.
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


// local namespace
var demo = {};


addEventListener("load", function() {
    // create the rendering context
    please.gl.set_context("gl_canvas");

    // setup gl state stuff
    please.set_clear_color(.93, .93, .93, 1.0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // add asset search paths
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");

    // load a shader
    please.load("demo.vert");
    please.load("demo.frag");
    
    // load our model files
    please.load("gavroche.jta");
    please.load("floor_lamp.jta");
    
    // test model
    please.load("graph_test.jta");

    // while not strictly necessary, the progress bar will make more
    // sense if we manually queue up textures here:
    please.load("uvmap.png");
    please.load("floor_lamp.png");

    // add a loading screen
    please.set_viewport(new please.LoadingScreen());

    // set some globals we'll be using in the demo
    window.lhs_mask = [1.0, 0.0, 0.0];
    window.rhs_mask = [0.0, 1.0, 1.0];
    window.lhs_mask.dirty = true;
    window.rhs_mask.dirty = true;

    // bind event hooks
    document.getElementById("render_mode").addEventListener(
        "change", render_mode_handler);
    document.getElementById("lhs_color").addEventListener(
        "change", color_pick_handler);
    document.getElementById("rhs_color").addEventListener(
        "change", color_pick_handler);
});


function render_mode_handler(event) {
    var color_set = document.getElementById("color_options");
    if (event.target.selectedOptions[0].value == "color") {
        color_set.style.display = "inline";
    }
    else {
        color_set.style.display = "none";
    }
};


function color_pick_handler(event) {
    var prefix = event.target.id.slice(0, 3);
    var part, result = [];
    for (var i=1; i<=5; i+=2) {
        part = event.target.value.slice(i, i+2);
        result.push(parseInt(part, 16)/255.0);
    }
    window[prefix+"_mask"] = result;
    window[prefix+"_mask"].dirty = true;
};


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var prog = please.glsl("custom", "demo.vert", "demo.frag");
    prog.activate();
    please.glsl("stereo_pass", "splat.vert", "stereo.frag");

    // grab inputs that'll influence the shader state
    var render_mode_select = document.getElementById("render_mode");
    var mode_active = function (mode_name) {
        return render_mode_select.selectedOptions[0].value === mode_name;
    }
    
    // access model data
    var gav_model = please.access("gavroche.jta");
    var lamp_model = please.access("floor_lamp.jta");
    //var test_model = please.access("graph_test.jta");

    // display licensing meta_data info, where applicable
    [gav_model, lamp_model].map(function (scene) {
        var target = document.getElementById("attribution_area");
        target.style.display = "block";
        var div = scene.get_license_html();
        if (div) {
            target.appendChild(div);
        }
    });

    // build the scene graph
    var graph = window.graph = new please.SceneGraph();

    // add a bunch of rotating objects
    var rotatoe = window.rotatoe = new please.GraphNode();
    var coords = [
        [-5, 0, 0],
        [5, 0, 0],
        [0, -5, 0],
        [0, 5, 0],
    ];
    for (var i=0; i<coords.length; i+=1) {
        var gav = gav_model.instance();
        gav.shader.mode = 3; // mode 2 + translucent
        gav.sort_mode = "alpha";
        gav.location = coords[i];
        gav.rotation_z = Math.random()*360;
        rotatoe.add(gav);
    }
    rotatoe.rotation_z = function () {
        var progress = performance.now()/110;
        return progress*-1;
    };
    var center = lamp_model.instance();
    //var center = test_model.instance();
    //center.scale = [1.2, 1.2, 1.2];
    center.shader.mode = 2; // indicate this is not the floor
    rotatoe.add(center);
    graph.add(rotatoe);

    // add row of lamps in the background
    var spacing = 5;
    var count = 4;
    var end = count*spacing;
    var start = end*-1;
    var y = -20;
    for (var x=start; x<=end; x+=spacing) {
        var lamp = lamp_model.instance();
        lamp.shader.mode = 2;
        lamp.location_x = x;
        lamp.location_y = y;
        lamp.rotation_z = Math.random()*360;
        graph.add(lamp);
    }

    // add a floor
    graph.add(new FloorNode());

    // add a camera
    var camera = window.camera = new please.StereoCamera();
    camera.look_at = vec3.fromValues(0, 0, 1);
    camera.location = [-3, 12.5, 5.7];
    camera.unit_conversion = 0.0025;

    // for reference:
    // camera.look_at = [null, null, null];
    // camera.location = [0, -2, -18];
    // camera.rotation = [-60, 0, 180];

    // add the camera to the scene graph
    graph.add(camera);

    // set up a directional light
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);

    // create render nodes
    
    var left_eye = new please.RenderNode("custom");
    left_eye.shader.light_direction = light_direction;
    left_eye.before_render = function () {
        camera.left_eye.activate();
    };
    left_eye.graph = graph;
    
    var right_eye = new please.RenderNode("custom");
    right_eye.shader.light_direction = light_direction;
    right_eye.before_render = function () {
        camera.right_eye.activate();
    };
    right_eye.graph = graph;

    var stereo_view = demo.stereo_view = new please.RenderNode("stereo_pass");
    stereo_view.shader.left_eye_texture = left_eye;
    stereo_view.shader.right_eye_texture = right_eye;
    stereo_view.shader.stereo_split = mode_active("frame");
    stereo_view.shader.left_color = window.left_mask;
    stereo_view.shader.right_color = window.right_mask;
    
    var mono_view = new please.RenderNode("custom");
    mono_view.shader.light_direction = light_direction;
    mono_view.before_render = function () {
        camera.activate();
    };
    mono_view.graph = graph;

    mono_view.peek = function () {
        if (mode_active("mono")) {
            return null;
        }
        else {
            return stereo_view;
        }
    };

    please.set_viewport(mono_view);
}));


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