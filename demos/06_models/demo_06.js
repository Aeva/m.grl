
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


var target = "gavroche.jta";


addEventListener("load", function() {
    please.gl.set_context("gl_canvas");
    please.media.search_paths.img = "assets/";
    please.gl.relative_lookup = true;

    please.load("glsl", "glsl/simple.vert");
    please.load("glsl", "glsl/simple.frag");
    window.model = {
        "loaded" : false,
    };
    //please.load("text", "gavroche.jta", pdq_loader);
    please.load("jta", target);
    please.media.connect_onload(main);
});


function main () {
    console.info("starting the demo");
    var canvas = document.getElementById("gl_canvas");
    var vert = please.access("glsl/simple.vert");
    var frag = please.access("glsl/simple.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // setup matricies & uniforms
    var projection = mat4.perspective(
        mat4.create(), 45, canvas.width/canvas.height, 0.1, 100.0);

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(.93, .93, .93, 1.0);
    var scale_factor = .325;
    scale_factor *= 10; // for old models

    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_06/draw", function () {
        var mark = performance.now();
        var modelview = mat4.create();

        mat4.lookAt(
            modelview,
            vec3.fromValues(20, 20, 20),
            vec3.fromValues(0, 0, 13),
            vec3.fromValues(0, 0, 1));

        modelview = mat4.rotateZ(modelview, modelview, please.radians(90*mark/10000));

        // rotate X for old models
        //modelview = mat4.rotateX(modelview, modelview, please.radians(90));

        modelview = mat4.scale(
            modelview, modelview, 
            vec3.fromValues(scale_factor, scale_factor, scale_factor));

        // -- update uniforms
        prog.vars.time = mark;
        prog.vars.modelview = modelview;
        prog.vars.projection = projection;

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        var model = please.access(target, true);
        if (model) {
            if (model.uniforms.texture) {
                prog.samplers.texture_map = model.uniforms.texture;
            }

            model.bind();
            model.draw();
        }
    });
    please.pipeline.start();
};
