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
    /*
      - First, we attach our opengl context to a canvas element.

      - Next, we request two shader programs to be downloaded.

      - When the shader sources finish downloading, we activate the
        main method to setup the demo!
     */
    please.gl.set_context("gl_canvas");
    please.load("glsl", "glsl/hello.vert");
    please.load("glsl", "glsl/hello.frag");
    please.media.connect_onload(main);
});


function main () {
    /*
      First order of business with webgl is to build a shader program.
      The vertex and fragment shaders are built by please.load, so all
      we have to do is fetch their wrappers via please.access and pass
      them to please.glsl, which will link the program and create
      bindings for all of the uniform variables.  This step is
      completed by calling prog.activate() to enable the shader.
     */
    console.info("starting the demo");
    var vert = please.access("glsl/hello.vert");
    var frag = please.access("glsl/hello.frag");
    var prog = please.glsl("default", vert, frag);
    prog.activate();

    // the canvas element is used here to avoid hardcoding the width /
    // height values, which the fragment shader makes use of via
    // uniforms.
    var canvas = document.getElementById("gl_canvas");

    /*
      Next step is to setup the default state and a few handy
      matricies.  I'm setting the perspective matrix here instead of
      in the draw function because I don't plan on changing it any
      point.  I cache the identity matrix here to make the code less
      verbose.  Matrix math is handled by the wonderful gl-matrix
      library.
     */

    // setup matricies & uniforms
    var identity = mat4.identity(mat4.create());
    var projection = mat4.perspective(mat4.create(), 45, 640.0/480.0, 0.1, 100.0);

    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enableVertexAttribArray(prog.attrs["vert_position"]);

    /*
      Next up is some basic geometry - later on I will add some tools
      to enable stuff to make this simpler for drawing sprites, as
      well as tools for loading models, and so on.  This extra
      functionality will be demonstrated in a later demo.
     */

    // create sophisticated geometry:
    var square = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, square);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        1.0,  1.0,  0.0,
        -1.0, 1.0,  0.0,
        1.0,  -1.0, 0.0,
        -1.0, -1.0, 0.0
    ]), gl.STATIC_DRAW);

    /*
      Last is the draw function, which when called will create a
      scheduling loop.
     */
  
    var draw = function () {
        // -- calculate a rotation value based on the elapsed time:
        var mark = performance.now();
        var rotation = mark/8; // every 8ms = 1degree

        // -- generate the modelview matrix
        var modelview = mat4.translate(mat4.create(), identity, vec3.fromValues(0, 0, -3.0));
        mat4.rotateZ(modelview, modelview, deg2rad(rotation));
        mat4.rotateX(modelview, modelview, deg2rad(rotation/9));

        // -- update uniforms
        prog.vars.time = mark;
        prog.vars.width = canvas.width;
        prog.vars.height = canvas.height;
        prog.vars.mv_matrix = modelview;
        prog.vars.p_matrix = projection;

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // -- DRAW GEOMETRY:
        // 1. bind a VBO to draw from
        gl.bindBuffer(gl.ARRAY_BUFFER, square);
        // 2. set the pointer for position data
        // (attrib index, data period/size, type, "normalized", stride, array_pointer)
        gl.vertexAttribPointer(prog.attrs["vert_position"], 3, gl.FLOAT, false, 0, 0);
        // 3. draw the VBO
        // (draw mode, start index, array length)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); 

        // -- reschedule this function
        requestAnimationFrame(draw);
    };
    draw();
};


// helper function to convert degrees to radians
var deg2rad = function (degrees) {
    return degrees*(Math.PI/180);
};
