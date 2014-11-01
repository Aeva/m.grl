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
    please.media.search_paths.img = "../gl_assets/img/";
    please.media.search_paths.jta = "../gl_assets/models/";
    please.gl.relative_lookup = true;

    please.load("glsl", "glsl/halftone.vert");
    please.load("glsl", "glsl/halftone.frag");

    please.relative_load("jta", "suzanne.jta");
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
    var rest = vec3.fromValues(0, -3, 2);
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


addEventListener("mgrl_media_ready", function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("gl_canvas").style.display = "block";

    // connect keyboard stuff

    please.keys.enable();
    please.keys.connect("up", key_handler);
    please.keys.connect("left", key_handler);
    please.keys.connect("down", key_handler);
    please.keys.connect("right", key_handler);

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");

    var vert = please.access("glsl/halftone.vert");
    var frag = please.access("glsl/halftone.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup matricies & uniforms
    var projection_matrix = mat4.perspective(
        mat4.create(), 45, canvas.width/canvas.height, 0.1, 100.0);
    var view_matrix = mat4.create();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // add model
    var suzanne = model_instance("suzanne.jta")
    var rotation_speed = .0005;

    // lighting stuff
    var light_direction = vec3.fromValues(-1.0, 1.0, 0.0);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);

    // frame buffer for our first render pass
    var buffer_size = 512;
    register_framebuffer("demo_07/draw", buffer_size);


    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_07/draw", function () {
        var mark = performance.now();

        // set render target
        set_framebuffer("demo_07/draw");
        gl.viewport(0, 0, buffer_size, buffer_size);

        // setup the projection matrix
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        mat4.perspective(projection_matrix, 45, canvas.width/canvas.height, 0.1, 100.0);

        // setup the camera
        mat4.lookAt(
            view_matrix,
            get_camera_position(), // camera
            vec3.fromValues(0, 0, 1),  // look at
            vec3.fromValues(0, 0, 1)   // up vector
        );

        // force cache expiration
        view_matrix.dirty = true;
        projection_matrix.dirty = true;

        // rotate suzanne
        suzanne.rz = (-90*mark*rotation_speed)-90;

        // update vars
        prog.vars.render_pass = 1;
        prog.vars.view_matrix = view_matrix;
        prog.vars.projection_matrix = projection_matrix;
        prog.vars.light_direction = light_direction;

        // draw suzanne
        suzanne.bind();
        suzanne.draw();
    });

    
    // add post processing pass
    please.pipeline.add(2, "demo_07/post", function () {

        // set render target
        set_framebuffer(null);
        prog.samplers.draw_pass = "demo_07/draw";
        gl.viewport(0, 0, canvas.width, canvas.height);

        // setup the projection matrix
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        mat4.perspective(projection_matrix, 45, canvas.width/canvas.height, 0.1, 100.0);

        /*
          A quick note / FIXME:

          I'm using the suzanne head again and zooming the camera way
          in to fill the screen with fragments.

          This really should just be a quad and orthographic
          projection to avoid confusion, but also to make the post
          processing phase a little faster, as well as *actually* fill
          the screen with fragments.
         */

        // setup the camera
        mat4.lookAt(
            view_matrix,
            vec3.fromValues(0, .1, .1), // camera
            vec3.fromValues(0, 0, 1),   // look at
            vec3.fromValues(0, 0, 1)    // up vector
        );

        // force cache expiration
        view_matrix.dirty = true;
        projection_matrix.dirty = true;

        // update vars
        prog.vars.render_pass = 2;
        prog.vars.view_matrix = view_matrix;
        prog.vars.projection_matrix = projection_matrix;
        prog.vars.width = canvas.width;
        prog.vars.height = canvas.height;

        // draw suzanne
        suzanne.bind();
        suzanne.draw();
    });

    
    // start the drawing loop
    please.pipeline.start();
});




// This function creates a matrix for transforming normals from model
// space to world space.
function normal_matrix (model_matrix) {
    var normal = mat3.create();
    mat3.fromMat4(normal, model_matrix);
    mat3.invert(normal, normal);
    mat3.transpose(normal, normal);
    return normal;
};


// temporary model instance function from demo 06
function model_instance (uri, model_matrix) {
    return {
        "x" : 0,
        "y" : 0,
        "z" : 0,
        "rx" : 0,
        "ry" : 0,
        "rz" : 0,
        "name" : please.relative("jta", uri),
        "__stamp" : performance.now(),

        "bind" : function () {
            var dt = performance.now() - this.__stamp;
            var model = please.access(this.name, true);
            var prog = please.gl.get_program();
            if (model && prog) {
                var position = mat4.create();
                mat4.translate(position, position, [this.x, this.y, this.z]);
                if (this.rx) {
                    mat4.rotateX(position, position, please.radians(this.rx));
                }
                if (this.ry) {
                    mat4.rotateY(position, position, please.radians(this.ry));
                }
                if (this.rz) {
                    mat4.rotateZ(position, position, please.radians(this.rz));
                }
                if (model_matrix) {
                    var new_mvmatrix = mat4.multiply(mat4.create(), model_matrix, position);
                    prog.vars.model_matrix = new_mvmatrix;
                    prog.vars.normal_matrix = normal_matrix(new_mvmatrix);
                }
                else {
                    prog.vars.model_matrix = position;
                    prog.vars.normal_matrix = normal_matrix(position);
                }

                if (model.uniforms.texture && prog.samplers.hasOwnProperty("texture_map")) {
                    prog.samplers.texture_map = model.uniforms.texture;
                }
                model.bind();
            }
        },

        "draw" : function () {
            var model = please.access(this.name, true);
            if (model) {
                model.draw();
            }
        },
    };
};


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
