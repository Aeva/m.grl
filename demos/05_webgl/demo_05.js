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

    please.load("glsl", "glsl/hello.vert");
    please.load("glsl", "glsl/hello.frag");

    please.media.connect_onload(main);
});


function main () {

    console.info("starting the demo");
    var vert = please.access("glsl/hello.vert");
    var frag = please.access("glsl/hello.frag");
    var prog = please.gl.sl("default", vert, frag);
    prog.activate();

    var canvas = document.getElementById("gl_canvas");

    // setup matricies & uniforms
    var identity = mat4.identity(mat4.create());
    var projection = mat4.perspective(mat4.create(), 45, 640.0/480.0, 0.1, 100.0);

    // convert degrees to radians
    var deg2rad = function (degrees) {
        return degrees*(Math.PI/180);
    };

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    
    var draw = function () {
        // calculate stuff
        var mark = performance.now();
        var rotation = mark/8; // every 8ms = 1degree
        var modelview = mat4.translate(mat4.create(), identity, vec3.fromValues(0, 0, -3.0));
        mat4.rotateZ(modelview, modelview, deg2rad(rotation));
        mat4.rotateX(modelview, modelview, deg2rad(rotation/9));

        // update uniforms
        prog.vars.time = mark;
        prog.vars.width = canvas.width;
        prog.vars.height = canvas.height;


        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        requestAnimationFrame(draw);
    };
    draw();
};