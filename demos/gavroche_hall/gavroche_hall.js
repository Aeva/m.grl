
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
    show_progress();
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // Clear loading screen, show canvas
    document.getElementById("loading_screen").style.display = "none";
    document.getElementById("gl_canvas").style.display = "block";

    // Create GL context, build shader pair
    var canvas = document.getElementById("gl_canvas");
    var vert = please.access("glsl/simple.vert");
    var frag = please.access("glsl/simple.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);

    // store our scene & build the graph:
    var model_data = window.scene = please.access(
        please.relative("jta", "gavroche_hall.jta"));

    var graph = new please.SceneGraph();
    var level_data = model_data.instance();
    graph.add(level_data);

    // define a simple 'driver' method
    level_data.rotate_z = function () {
        var now = performance.now();
        return (-90*(now/100000))-90;
    };

    // add a camera object
    var camera = new please.PerspectiveCamera(canvas);
    camera.look_at = vec3.fromValues(0, 10, 2.5);
    camera.location = vec3.fromValues(4, -15.5, 12);
    
    // add the camera to the graph
    graph.camera = camera;
    
    // register a render pass with the scheduler
    please.pipeline.add(1, "gavroche_hall/draw", function () {
        // -- update uniforms
        prog.vars.time = performance.now();

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // -- draw the scene graph
        graph.tick();
        graph.draw();
    });
    please.pipeline.start();
}));
