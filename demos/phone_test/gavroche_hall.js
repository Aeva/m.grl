"use strict";
/*

 Midnight Graphics & Recreation Library Demos:

 This file - at the time of writing - is being used to test and debug
 the new JTA model loader and the scene graph.
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


// keyboard control stuff
var key_tracker = {
    "left" : null,
    "right" : null,
};
function key_handler(state, key) {
    // arrow key handler
    if (state === "cancel") {
        if (key_tracker[key] !== null) {
            please.time.remove(key_tracker[key].handler);
            key_tracker[key] = null;
        }
    }
    else if (state === "press" && key_tracker[key] === null) {
        var start_time = performance.now();

        var amount = .15;
        if (key == "left") {
            amount *= -1;
        }

        var frequency = 5;
        var handler = function (timestamp) {
            var delta = timestamp - key_tracker[key].stamp;
            key_tracker[key].stamp = timestamp;

            // 'delta' is assumed to usually be higher than the ideal
            // frequency, so 'late' is the amount of extra time
            // waited.  
            var late = delta - frequency;

            // 'scale' is the amount that distances should be adjusted by.
            var scale = delta/frequency;

            if (window.player && delta > 0) {
                //window.player.location_x += amount;
                window.player.location_x += (amount / frequency) * delta;

                // snap to level boundaries
                if (window.player.location_x < -15) {
                    window.player.location_x = -15;
                }
                if (window.player.location_x > 15) {
                    window.player.location_x = 15;
                }
            }
            please.time.schedule(handler, frequency - late);
        };
        please.time.schedule(handler, frequency);

        key_tracker[key] = {
            "stamp" : start_time,
            "handler" : handler,
        };
    }
};


addEventListener("load", function() {
    please.gl.set_context("gl_canvas", {
        antialias : false,
        premultipliedAlpha: false,
    });
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");

    // files that load files will use relative file paths
    please.gl.relative_lookup = true;

    // load shader sources
    please.load("simple.vert");
    please.load("simple.frag");
    please.load("splat.vert");
    please.load("upsample.frag");

    // load our model files
    please.load("gavroche_hall.jta");
    please.load("psycho.jta");
    show_progress();
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("demo_area").style.display = "block";

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var prog = please.glsl("default", "simple.vert", "simple.frag");
    please.glsl("upsample", "splat.vert", "upsample.frag");
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // blending stuff
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // store our scene & build the graph:
    var level_data = window.scene = please.access("gavroche_hall.jta");
    var char_data = please.access("psycho.jta");

    // build the scene
    var graph = new please.SceneGraph();
    var level_node = level_data.instance();
    var char_avatar = char_data.instance();
    char_avatar.location_y = -2.5;
    var char_node = window.player = new please.GraphNode();
    char_node.location_x = -1.8;
    char_node.location_z = 6;

    // add some driver methods to animate things
    char_avatar.rotation_z = function () {
        return char_node.location_x*45;
    };
    char_avatar.location_z = function () {
        var progress = performance.now()/500;
        return Math.sin(progress)/2.0;
    };

    // add our models to the graph
    graph.add(level_node);
    graph.add(char_node);
    char_node.add(char_avatar);

    // add a camera object
    var camera = window.camera = new please.CameraNode();
    //camera.look_at = vec3.fromValues(0, 10, 2.5);
    camera.look_at = char_node;
    camera.location = function () {
        return [char_node.location_x / -2.0,
                char_node.location_y - 14,
                char_node.location_z + 6];
    };
    camera.fov = 57.29; // zoom out a bit
    
    // Add the camera to the scene graph
    graph.add(camera);

    // If the camera is not explicitely activated, then the scene
    // graph will attempt to pick one to use.  In this case we have
    // only one so it doesn't matter, BUT it is generally good
    // practice to explicitly activate the camera you want to use:
    camera.activate();

    // connect keyboard handlers
    please.keys.enable();
    please.keys.connect("left", key_handler);
    please.keys.connect("right", key_handler);

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
    });//.as_texture({"width":1024, "height":1024});

    // // register a render pass with the scheduler
    // please.pipeline.add(Infinity, "phone/upsample_pass", function () {
    //     // upsample the frame buffer
    //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //     var prog = please.gl.get_program("upsample");
    //     prog.activate();
    //     prog.samplers.color_pass = "phone/draw";
    //     please.gl.splat();
    // });
    please.pipeline.start();
}));
