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


addEventListener("load", function() {
    please.gl.set_context("gl_canvas");
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

    // show the progress bar
    show_progress();

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


function show_progress() {
    if (please.media.pending.length > 0) {
        var progress = please.media.get_progress();
        if (progress.all > -1) {
            var bar = document.getElementById("progress_bar");
            var label = document.getElementById("percent");
            bar.style.width = "" + progress.all + "%";
            label.innerHTML = "" + Math.round(progress.all) + "%";
            var files = please.get_properties(progress.files);
            var info = document.getElementById("progress_info");
            info.innerHTML = "" + files.length + " file(s)";
        }
        setTimeout(show_progress, 100);
    }
};


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("demo_area").style.display = "block";

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var prog = please.glsl("default", "demo.vert", "demo.frag");
    prog.activate();
    please.glsl("stereo_pass", "splat.vert", "stereo.frag");

    // grab inputs that'll influence the shader state
    var render_mode_select = document.getElementById("render_mode");
    var mode_active = function (mode_name) {
        return render_mode_select.selectedOptions[0].value === mode_name;
    }

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    please.set_clear_color(.93, .93, .93, 1.0);
    
    // enable alpha blending
    gl.enable(gl.BLEND);
    //gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
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
    // -- update shader var for light direction
    prog.vars.light_direction = light_direction;

    
    // Define a skip condition callback, so that the pipeline stages
    // for the eye buffers can be skipped completely when they are not
    // needed.  This is useful because it also skips automatic state
    // changes that would happen automatically to set up indirect
    // rendering etc.
    var skip_condition = function () {
        return mode_active("mono");
    };

    
    // Left eye render pass
    please.pipeline.add(10, "demo/left_eye", function () {
        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // -- set the shader program
        please.gl.get_program("default").activate();

        // -- activate the camera
        camera.left_eye.activate();

        // -- draw the geometry
        graph.draw();
    }).as_texture().skip_when(skip_condition);

    
    // Right eye render pass
    please.pipeline.add(10, "demo/right_eye", function () {
        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // -- set the shader program
        please.gl.get_program("default").activate();

        // -- activate the camera
        camera.right_eye.activate();

        // -- draw the geometry
        graph.draw();
    }).as_texture().skip_when(skip_condition);


    // Render the hardware-specific stereo split logic
    please.pipeline.add(20, "demo/stereo_killed_the_video_star", function () {
        if (!mode_active("mono")) {
            // -- clear the screen
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // -- set the shader program
            var prog = please.gl.get_program("stereo_pass");
            prog.activate();
            prog.samplers.left_eye_texture = "demo/left_eye";
            prog.samplers.right_eye_texture = "demo/right_eye";
            prog.vars.stereo_split = mode_active("frame");

            prog.vars.left_color = window.lhs_mask;
            prog.vars.right_color = window.rhs_mask;

            // -- fullscreen quad
            please.gl.splat();
        }
        else {
            // -- clear the screen
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            
            // -- set the shader program
            please.gl.get_program("default").activate();
            
            // -- activate the camera
            camera.activate();
            
            // -- draw the geometry
            graph.draw();
        }
    });


    please.pipeline.start();
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