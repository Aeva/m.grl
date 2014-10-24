
"use strict";
/*

 Mondaux Graphics & Recreation Library : DEMO 05
.

 Licensed under the Apache License, Version 2.0 (the "License"); you
 may not use this file except in compliance with the License.  You may
 obtain a copy of the License at

 --> http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 implied.  See the License for the specific language governing
 permissions and limitations under the License.
.

 Have a nice day! ^_^

 */


addEventListener("load", function() {
    please.gl.set_context("gl_canvas");
    please.media.search_paths.img = "../gl_assets/img/";
    please.media.search_paths.jta = "../gl_assets/models/";
    
    // files that load files will use relative file paths
    please.gl.relative_lookup = true;

    // load shader sources
    please.load("glsl", "glsl/simple.vert");
    please.load("glsl", "glsl/simple.frag");

    // load our model files
    please.relative_load("jta", "gavroche_hall.jta");

    please.media.connect_onload(main);
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


function main () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("gl_canvas").style.display = "block";

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var vert = please.access("glsl/simple.vert");
    var frag = please.access("glsl/simple.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup matricies & uniforms
    var projection_matrix = mat4.perspective(
        mat4.create(), 45, canvas.width/canvas.height, 0.1, 100.0);
    var view_matrix = mat4.create();
    var model_matrix = mat4.create();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // store our scene:
    var scene = window.scene = please.access(please.relative("jta", "gavroche_hall.jta"));

    //
    var camera_coords = vec3.fromValues(11.584, -19.953, 12.076);
    var lookat_coords = vec3.fromValues(0, 0, 1);
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);
    
    // register a render pass with the scheduler
    please.pipeline.add(1, "gavroche_hall/draw", function () {
        var mark = performance.now();
        mat4.identity(model_matrix);
        mat4.lookAt(
            view_matrix,
            camera_coords,
            lookat_coords,
            vec3.fromValues(0, 0, 1) // up vector
        );

        var slowdown = 5000;
        //model_matrix = mat4.rotateZ(
        //    model_matrix, model_matrix, please.radians((-90*mark/slowdown)-90));

        // -- update uniforms
        prog.vars.time = mark;
        prog.vars.view_matrix = view_matrix;
        prog.vars.model_matrix = model_matrix;
        prog.vars.projection_matrix = projection_matrix;

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        scene.test_draw();
    });
    please.pipeline.start();
};
