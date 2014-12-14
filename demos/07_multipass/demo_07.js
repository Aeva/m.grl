"use strict";
/*

 Mondaux Graphics & Recreation Library Demos:

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
    please.gl.set_context("gl_canvas");
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("img", "../gl_assets/img/");
    please.set_search_path("jta", "../gl_assets/models/");

    please.load("halftone.vert");
    please.load("halftone.frag");
    please.load("suzanne.jta");
    show_progress();
});


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


addEventListener("mgrl_media_ready", function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("demo_area").style.display = "block";

    // connect keyboard stuff
    please.keys.enable();
    please.keys.connect("up", key_handler);
    please.keys.connect("left", key_handler);
    please.keys.connect("down", key_handler);
    please.keys.connect("right", key_handler);

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var vert = please.access("halftone.vert");
    var frag = please.access("halftone.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // add model
    var suzanne_data = please.access("suzanne.jta");
    var rotation_speed = .0005;

    // display licensing meta_data info, where applicable
    /*
    [suzanne_data].map(function (scene) {
        var target = document.getElementById("attribution_area");
        target.style.display = "block";
        var div = scene.get_license_html();
        if (div) {
            target.appendChild(div);
        }
    });
    */

    // build the scene graph
    var graph_a = new please.SceneGraph();
    var suzanne = suzanne_data.instance();
    suzanne.rotate_y = function () {
        var progress = performance.now()/5000;
        return progress*-1;
    };
    graph_a.add(suzanne);

    var graph_b = new please.SceneGraph();
    graph_b.add(suzanne_data.instance());

    // frame buffer for our first render pass
    var buffer_size = 512;
    register_framebuffer("demo_07/draw", buffer_size);

    // setup camera_a
    var camera_a = new please.CameraNode();
    graph_a.add(camera_a);
    camera_a.look_at = vec3.fromValues(0, 0, 1);
    camera_a.x = function () { return get_camera_position()[0]; };
    camera_a.y = function () { return get_camera_position()[1]; };
    camera_a.z = function () { return get_camera_position()[2]; };
    //camera_a.width = buffer_size;
    //camera_a.height = buffer_size;
    graph_a.camera = camera_a;

    // setup camera_b
    var camera_b = new please.CameraNode();
    graph_b.add(camera_b);
    camera_b.look_at = vec3.fromValues(0, 0, 1);
    camera_b.x = 0;
    camera_b.y = 0.1;
    camera_b.z = 0.1;
    graph_b.camera = camera_b;

    // lighting stuff
    var light_direction = vec3.fromValues(-1.0, 1.0, 0.0);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);

    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_07/draw", function () {
        // update uniforms
        prog.vars.time = performance.now();
        prog.vars.light_direction = light_direction;
        prog.vars.render_pass = 1;
        prog.vars.width = buffer_size;
        prog.vars.height = buffer_size;

        // set render target
        set_framebuffer("demo_07/draw");
        gl.viewport(0, 0, buffer_size, buffer_size);

        // clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // draw the scene
        graph_a.tick();
        graph_a.draw();
    });

    
    // add post processing pass
    please.pipeline.add(2, "demo_07/post", function () {
        // update uniforms
        prog.vars.render_pass = 2;
        prog.vars.width = canvas.width;
        prog.vars.height = canvas.height;

        // set render target
        set_framebuffer(null);
        prog.samplers.draw_pass = "demo_07/draw";
        gl.viewport(0, 0, canvas.width, canvas.height);

        // setup the projection matrix
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        /*
          A quick note / FIXME:

          I'm using the suzanne head again and zooming the camera way
          in to fill the screen with fragments.

          This really should just be a quad and orthographic
          projection to avoid confusion, but also to make the post
          processing phase a little faster, as well as *actually* fill
          the screen with fragments.
         */

        // draw suzanne
        graph_b.tick();
        graph_b.draw();
    });
    
    // start the drawing loop
    please.pipeline.start();
});


function register_framebuffer(handle, size) {
    if (please.gl.__cache.textures[handle]) {
        throw("Cannot register framebuffer to occupied handel: " + hande);
    }

    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    if (!size) {
        size = 512;
    }
    fbo.size = size;
    
    var tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, 
                  gl.RGBA, gl.UNSIGNED_BYTE, null);

    var render = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, render);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, render);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    please.gl.__cache.textures[handle] = tex;
    please.gl.__cache.textures[handle].fbo = fbo;
};


function set_framebuffer(handle) {
    if (!handle) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    else {
        var tex = please.gl.__cache.textures[handle];
        if (tex && tex.fbo) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fbo);
        }
        else {
            throw ("No framebuffer registered for " + handle);
        }
    }
};
