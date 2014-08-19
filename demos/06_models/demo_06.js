
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
    please.relative_load("jta", "gavroche.jta");
    please.relative_load("jta", "floor_lamp.jta");

    // while not strictly necessary, the progress bar will make more
    // sense if we manually queue up textures here:
    please.relative_load("img", "uvmap.png");
    please.relative_load("img", "floar_lamp.png");

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
    //gl.clearColor(.93, .93, .93, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);


    // store the models we're going to display
    var models = [
        floor_quad(),
        model_instance("floor_lamp.jta", model_matrix),
    ];

    var coords = [
        [-5, 0, 0],
        [5, 0, 0],
        [0, -5, 0],
        [0, 5, 0],
    ];

    // add a bunch of gavroches
    for (var i=0; i<coords.length; i+=1) {
        var gav = model_instance("gavroche.jta", model_matrix);
        gav.x = coords[i][0];
        gav.y = coords[i][1];
        gav.z = coords[i][2];
        gav.rz = Math.random()*360;
        models.push(gav);
    }

    // add row of lamps in the background
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

    var camera_coords = vec3.fromValues(-3, 10, 6);
    var lookat_coords = vec3.fromValues(0, 0, 1);
    var light_direction = vec3.fromValues(.25, -1.0, -.4);
    vec3.normalize(light_direction, light_direction);
    vec3.scale(light_direction, light_direction, -1);
    
    // register a render pass with the scheduler
    please.pipeline.add(1, "demo_06/draw", function () {
        var mark = performance.now();
        mat4.identity(model_matrix);
        mat4.lookAt(
            view_matrix,
            camera_coords,
            lookat_coords,
            vec3.fromValues(0, 0, 1) // up vector
        );

        var slowdown = 5000;
        model_matrix = mat4.rotateZ(
            model_matrix, model_matrix, please.radians((-90*mark/slowdown)-90));

        // -- update uniforms
        prog.vars.time = mark;
        prog.vars.light_direction = light_direction;
        prog.vars.view_matrix = view_matrix;
        prog.vars.model_matrix = model_matrix;
        prog.vars.projection_matrix = projection_matrix;
        prog.vars.normal_matrix = normal_matrix(model_matrix, view_matrix);


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


// This function creates a matrix for transforming normals from model
// space to world space.
function normal_matrix (model_matrix) {
    var normal = mat3.create();
    mat3.fromMat4(normal, model_matrix);
    mat3.invert(normal, normal);
    mat3.transpose(normal, normal);
    return normal;
};


function floor_quad () {
    var vbo = please.gl.make_quad(100, 100);
    var world_matrix = mat4.create();

    return {
        "bind" : function () {
            var prog = please.gl.get_program();
            prog.vars.mode = 1; // floor mode
            prog.vars.model_matrix = world_matrix;
            prog.vars.normal_matrix = normal_matrix(world_matrix);
            vbo.bind();
        },

        "draw" : function () {
            vbo.draw();
        },
    };
};


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
                prog.vars.mode = 2; // not-floor mode
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
