
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


// keyboard control stuff
var key_timers = {
    "left" : null,
    "right" : null,
};
function key_handler(state, key) {
    // arrow key handler
    if (state === "cancel") {
        window.clearInterval(key_timers[key]);
        key_timers[key] = null;
    }
    else if (state === "press" && key_timers[key] === null) {
        var amount = .15;
        if (key == "left") {
            amount *= -1;
        }
        key_timers[key] = window.setInterval(function () {
            if (window.player) {
                window.player.x += amount;
                if (window.player.x < -15) {
                    window.player.x = -15;
                }
                if (window.player.x > 15) {
                    window.player.x = 15;
                }                
            }
        }, 1);
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
    please.relative_load("jta", "psycho.jta");
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
    var level_data = window.scene = please.access(
        please.relative("jta", "gavroche_hall.jta"));
    var char_data = please.access(
        please.relative("jta", "psycho.jta"));

    var graph = new please.SceneGraph();
    var level_node = level_data.instance();
    var char_avatar = char_data.instance();
    char_avatar.y = -2.5;
    var char_node = window.player = new please.GraphNode();
    char_node.x = -1.8;
    char_node.z = 6;

    // add some driver methods to animate things
    char_avatar.rotate_z = function () {
        return char_node.x;
    };
    char_avatar.z = function () {
        var progress = performance.now()/500;
        return Math.sin(progress)/2.0;
    };

    // add our models to the graph
    graph.add(level_node);
    graph.add(char_node);
    char_node.add(char_avatar);

    // add a camera object
    var camera = new please.PerspectiveCamera(canvas);
    //camera.look_at = vec3.fromValues(0, 10, 2.5);
    camera.look_at = char_node;
    camera.location = function () {
        var x = char_node.x/-2.0;
        var y = char_node.y - 14;
        var z = char_node.z + 6;
        return vec3.fromValues(x,y,z);
    };
    
    // add the camera to the graph
    graph.camera = camera;

    // connect keyboard handlers
    please.keys.enable();
    please.keys.connect("left", key_handler);
    please.keys.connect("right", key_handler);
    
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
