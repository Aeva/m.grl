
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
    please.media.search_paths.img = "assets/";
    please.load("glsl", "glsl/simple.vert");
    please.load("glsl", "glsl/simple.frag");
    window.model = {
        "loaded" : false,
    };
    please.load("text", "gavroche.jta", pdq_loader);
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

    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_06/draw", function () {
        var mark = performance.now();
        var modelview = mat4.create();
        //modelview = mat4.translate(modelview, modelview, vec3.fromValues(0, 0, -3));
        mat4.lookAt(
            modelview,
            vec3.fromValues(20, 20, 20),
            vec3.fromValues(0, 0, 13),
            vec3.fromValues(0, 0, 1));
            

        modelview = mat4.rotateZ(modelview, modelview, please.radians(90*mark/800));
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
        if (window.model.loaded) {
            var model = window.model.attrs;
            for (var attr in window.model.attrs) {
                if (model.hasOwnProperty(attr) && prog.attrs[attr]) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, model[attr].id);
                    gl.vertexAttribPointer(prog.attrs[attr], 3, gl.FLOAT, false, 0, 0);
                }
            }
            gl.drawArrays(gl.TRIANGLES, 0, model["position"].data.length/3);            
        }
    });
    please.pipeline.start();
};




// take a base64 encoded array of binary data and return something
// that we can cast to such like Float32Array etc
function array_buffer(blob) {
    var raw = atob(blob);
    var buffer = new ArrayBuffer(raw.length);
    var data = new DataView(buffer);
    for (var i=0; i<raw.length; i+=1) {
        // fixme - charCodeAt might think something is unicode and
        // produce garbage
        data.setUint8(i, raw.charCodeAt(i));
    }
    return buffer;
};




function pdq_loader(status, url) {
    // parse data out of a jta file
    var raw = JSON.parse(please.access(url))
    var data = raw["vertex_groups"]["default"];
    var model = {};
    for (var attr in data) if (data.hasOwnProperty(attr)) {
        // parse attrs from model
        var hint = data[attr][0];
        var raw = data[attr][1];
        model[attr] = {
            "id" : gl.createBuffer(),
            "data" : new Float32Array(array_buffer(raw)),
        };
        // create buffer objects
        gl.bindBuffer(gl.ARRAY_BUFFER, model[attr].id);
        gl.bufferData(gl.ARRAY_BUFFER, model[attr].data, gl.STATIC_DRAW);
        console.info("Created '"+attr+"' array buffer for: " + url);
    };

    window.model = {
        "loaded" : true,
        "attrs": model,
        "faces" : model["position"].data.length/3,
    };
};