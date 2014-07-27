
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
            window.model.bind();
            window.model.draw();
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
    var directory = JSON.parse(please.access(url))
    var vertex_data = directory["vertex_groups"]["default"];
    var uniforms = directory["vars"];
    var model = {};

    // first create our attribute lists:
    var size = 0;
    for (var attr in vertex_data) if (vertex_data.hasOwnProperty(attr)) {
        var hint = vertex_data[attr].hint;
        var raw = vertex_data[attr].data;
        model[attr] = {
            "data" : new Float32Array(array_buffer(raw)),
            "size" : vertex_data[attr].size,
            /*
              The size attribute means this:
              1 = float,
              2 = vec2,
              3 = vec3,
              9 = mat3,
              12 = mat4.

              The array length and item count are otherwise inferred.
             */
        };
        size += model[attr].data.length;
    }

    // combine the attribute lists into a single array
    var vert_array = new Float32Array(size);
    var bind_order = [];
    var bind_offsets = [];
    var offset = 0;
    for (var attr in model) if (model.hasOwnProperty(attr)) {
        var subset = model[attr].data;
        vert_array.set(subset, offset);
        bind_offsets.push(offset);
        bind_order.push(attr);
        offset += subset.length;
    }

    // create the vertex buffer object for our attributes
    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vert_array, gl.STATIC_DRAW);
    console.info("Created VBO for: " + url);

    // create our model object:
    window.model = {
        "loaded" : false,
        "vbo" : vbo,
        "__bind_order" : bind_order,
        "__bind_offsets" : bind_offsets,
        "__prog" : false,
        "attrs" : model,
        "faces" : model["position"].data.length/3,
        "texture" : null,
        
        "bind" : function () {
            if (!this.__prog) {
                this.__prog = please.gl.get_program('default');
            }
            var prog = this.__prog;
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
            for (var i=this.__bind_order.length-1; i>=0; i-=1) {
                var attr = this.__bind_order[i];
                var offset = this.__bind_offsets[i];
                if (prog.attrs[attr]) {
                    gl.vertexAttribPointer(
                        prog.attrs[attr].loc, 3, gl.FLOAT, false, 0, offset*4);
                }
            }

            /// pdq texture stuff
            if (this.texture && prog.vars.hasOwnProperty("texture_map")) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this.texture.id);
                prog.vars["texture_map"] = 0;
            }
        },
        "draw" : function () {
            gl.drawArrays(gl.TRIANGLES, 0, this.faces);            
        },
    };

    // call when the model is ready to draw:
    var on_model_ready = function () {
        window.model.loaded = true;
    };

    // texture prep stuff:
    var wait_for_texture = false;
    var texture = null;
    if (uniforms["texture"]) {
        texture = {
            "img" : null,
            "id" : gl.createTexture(),
        };
        var t_hint = uniforms["texture"].hint;
        var t_mode = uniforms["texture"].mode;
        var t_uri = uniforms["texture"].uri;
        var t_md5 = uniforms["texture"].md5;

        var bind_texture = function (uri) {
            console.info("binding texture for: " + uri);
            texture.img = please.access(uri);
            
            // do some pdq texture stuff here
            gl.bindTexture(gl.TEXTURE_2D, texture.id);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
                          gl.UNSIGNED_BYTE, texture.img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.bindTexture(gl.TEXTURE_2D, null);

            window.model.texture = texture;
            on_model_ready();
        };

        if (t_mode === "linked") {
            wait_for_texture = true;
            please.relative_load("img", t_uri, function (status, url) {
                bind_texture(url);
            });
        }

        else if (t_mode === "packed") {
            // FIXME the purpose of the md5 thing is to avoid
            // redundant image files and texture objects.
            var img = new Image();
            img.onload = function () {
                bind_texture(t_md5);
            };
            img.src = t_uri;
            please.media.assets[t_md5] = img;
        }

        else {
            texture = null;
            console.error("Cannot load texture uniform.");
        }
    }

    // if we're waiting for a texture, on_model_ready will be a
    // callback, and will be called elsewhere instead.  Otherwise:
    if (!wait_for_texture) {
        on_model_ready();
    }
};