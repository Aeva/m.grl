
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
    please.gl.relative_lookup = true;

    please.load("glsl", "glsl/simple.vert");
    please.load("glsl", "glsl/simple.frag");
    window.model = {
        "loaded" : false,
    };
    //please.load("text", "gavroche.jta", pdq_loader);
    please.load("jta", "gavroche.jta");
    please.load("jta", "floor_lamp.jta");
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
    var camera = mat4.create();
    var offset = mat4.create();


    // setup default state stuff    
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    //gl.clearColor(.93, .93, .93, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    var scale_factor = .325;
    scale_factor *= 10; // for old models


    // store the models we're going to display
    var models = [
        model_instance("floor_lamp.jta", offset),
    ];

    var coords = [
        [-5, 0, 0],
        [5, 0, 0],
        [0, -5, 0],
        [0, 5, 0],
    ];

    for (var i=0; i<coords.length; i+=1) {
        var gav = model_instance("gavroche.jta", offset);
        gav.x = coords[i][0];
        gav.y = coords[i][1];
        gav.z = coords[i][2];
        gav.rz = Math.random()*360;
        models.push(gav);
    }

    var spacing = 5;
    var count = 10;
    var end = count*spacing;
    var start = end*-1;
    var y = -20;
    for (var x=start; x<=end; x+= spacing) {
        var lamp = model_instance("floor_lamp.jta");
        lamp.x = x;
        lamp.y = y;
        lamp.rz = Math.random()*20-10;
        models.push(lamp);
    }

    var camera_x = -3;
    var camera_y = 10;
    var camera_z = 6;

    var lookat_x = 0;
    var lookat_y = 0;
    var lookat_z = 1;
    
    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_06/draw", function () {
        var mark = performance.now();
        mat4.identity(offset);
        mat4.lookAt(
            camera,
            vec3.fromValues(camera_x, camera_y, camera_z), // camera coords
            vec3.fromValues(lookat_x, lookat_y, lookat_z),   // focal point
            vec3.fromValues(0, 0, 1)    // up vector
        );

        var slowdown = 5000;
        offset = mat4.rotateZ(offset, offset, please.radians((-90*mark/slowdown)-90));

        // -- update uniforms
        prog.vars.time = mark;
        prog.vars.view_matrix = camera;
        prog.vars.model_matrix = offset;
        prog.vars.projection_matrix = projection;

        // -- update uniforms for lighting
        prog.vars.nega_camera_matrix = mat4.invert(mat4.create(), camera);
        prog.vars.camera_coords = vec3.fromValues(camera_x, camera_y, camera_z);
        prog.vars.light_coords = vec3.fromValues(0, 0, 4);

        // -- clear the screen
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // -- draw geometry
        for (var i=0; i<models.length; i+=1) {
            models[i].bind();
            models[i].draw();
        }
    });
    please.pipeline.start();
};


function model_instance (uri, global_position) {
    return {
        "x" : 0,
        "y" : 0,
        "z" : 0,
        "rx" : 0,
        "ry" : 0,
        "rz" : 0,
        "name" : uri,
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
                if (global_position) {
                    prog.vars.model_matrix = mat4.multiply(mat4.create(), global_position, position);
                }
                else {
                    prog.vars.model_matrix = position;
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