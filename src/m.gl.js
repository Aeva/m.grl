// - m.gl.js ------------------------------------------------------------- //


// "glsl" media type handler
please.media.search_paths.glsl = "",
please.media.handlers.glsl = function (url, callback) {
    var media_callback = function (req) {
        please.media.assets[url] = please.gl.__build_shader(req.response, url);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};


// "jta" media type handler
please.media.search_paths.jta = "";
please.media.handlers.jta = function (url, callback) {
    var media_callback = function (req) {
        please.media.assets[url] = please.gl.__jta_model(req.response, url);
    };
    please.media.__xhr_helper("text", url, media_callback, callback);
};


// Namespace for m.gl guts
please.gl = {
    "canvas" : null,
    "ctx" : null,
    "__cache" : {
        "current" : null,
        "quad" : null,
        "programs" : {},
        "textures" : {},
    },
    "relative_lookup" : false, // used by please.gl.get_texture(...) below
    
    // binds the rendering context
    "set_context" : function (canvas_id) {
        if (this.canvas !== null) {
            throw("This library is not presently designed to work with multiple contexts.");
        }

        this.canvas = document.getElementById(canvas_id);
        try {
            var names = ["webgl", "experimental-webgl"];
            for (var n=0; n<names.length; n+=1) {
                this.ctx = this.canvas.getContext(names[n]);
                if (this.ctx !== null) {
                    break;
                }
            }
        }
        catch (err) {}
        if (this.ctx === null) {
            alert("cant webgl! halp!");
        }
        else {
            window.gl = this.ctx;
        }
    },

    // Returns an object for a built shader program.  If a name is not
    // given, the active program is returned, if applicable.
    "get_program" : function (name) {
        if (name) {
            return this.__cache.programs[name];
        }
        else {
            return this.__cache.current;
        }
    },

    // Take a base64 encoded array of binary data and return something
    // that can be cast into a typed array eg Float32Array:
    "array_buffer" : function (blob) {
        var raw = atob(blob);
        var buffer = new ArrayBuffer(raw.length);
        var data = new DataView(buffer);
        for (var i=0; i<raw.length; i+=1) {
            // fixme - charCodeAt might think something is unicode and
            // produce garbage....?
            data.setUint8(i, raw.charCodeAt(i));
        }
        return buffer;
    },
};


// Helper function for creating texture objects from the asset cache.
// Implies please.load etc:
please.gl.get_texture = function (uri, use_placeholder, no_error) {
    
    // Check to see if we're doing relative lookups, and adjust the
    // uri if necessary.  Accounts for manually added assets.
    if (!please.media.assets[uri] && please.gl.relative_lookup && uri !=="error") {
        uri = please.relative("img", uri);
    }


    // See if we already have a texture object for the uri:
    var texture = please.gl.__cache.textures[uri];
    if (texture) {
        return texture;
    }


    // No texture, now we check to see if the asset is present:
    var asset = please.access(uri, true);
    if (asset) {
        return please.gl.__build_texture(uri, asset);
    }
    else {
        // Queue up the asset for download, and then either return a place
        // holder, or null
        please.load("img", uri, function (state, uri) {
            if (state === "pass") {
                var asset = please.access(uri, false);
                please.gl.__build_texture(uri, asset);
            }
            else if (!no_error) {
                // FIXME: separate failure target for gl models?
                var tid = please.gl.get_texture("error", null, true);
                please.gl.__cache.textures[uri] = tid;
            }
        });
        if (use_placeholder) {
            return please.gl.get_texture(use_placeholder, null, no_error);
        }
        else {
            return null;
        }
    }
};


// Used by please.gl.get_texture
please.gl.__build_texture = function (uri, image_object) {
    // bind and load the texture, cache and return the id:

    if (image_object.loaded === false) {
        image_object.addEventListener("load", function () {
            please.gl.__build_texture(uri, image_object);            
        });
        return null;
    }

    if (!please.gl.__cache.textures[uri]) {
        console.info("Loading texture: " + uri);
        var tid = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tid);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        // FIXME: should we not assume gl.RGBA?
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, 
                      gl.UNSIGNED_BYTE, image_object);
        // FIXME: or any of this?
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.bindTexture(gl.TEXTURE_2D, null);

        please.gl.__cache.textures[uri] = tid;
        return tid;
    }
    else {
        return please.gl.__cache.textures[uri];
    }
};


// Constructor function for GLSL Shaders
please.gl.__build_shader = function (src, uri) {
    var glsl = {
        "id" : null,
        "type" : null,
        "src" : src,
        "uri" : uri,
        "ready" : false,
        "error" : false,
    };

    // determine shader's type from file name
    if (uri.endsWith(".vert")) {
        glsl.type = gl.VERTEX_SHADER;
    }
    if (uri.endsWith(".frag")) {
        glsl.type = gl.FRAGMENT_SHADER;
    }

    // build the shader
    if (glsl.type !== null) {
        glsl.id = gl.createShader(glsl.type);
        gl.shaderSource(glsl.id, glsl.src);
        gl.compileShader(glsl.id);
        // check compiler output
        if (!gl.getShaderParameter(glsl.id, gl.COMPILE_STATUS)) {
            glsl.error = gl.getShaderInfoLog(glsl.id);
            console.error(
                "Shader compilation error for: " + uri + " \n" + glsl.error);
            alert("" + glsl.uri + " failed to build.  See javascript console for details.");
        }
        else {
            console.info("Shader compiled: " + uri);
            glsl.ready = true;
        }
    }
    else {
        glsl.error = "unknown type for: " + uri;
        throw("Cannot create shader - unknown type for: " + uri);
    }

    return glsl;
};


// Constructor function for building a shader program.  Give the
// program a name (for caching), and pass any number of shader objects
// to the function.
please.glsl = function (name /*, shader_a, shader_b,... */) {
    var build_fail = "Shader could not be activated..?";

    var prog = {
        "name" : name,
        "id" : null,
        "vars" : {}, // uniform variables
        "attrs" : {}, // attribute variables
        "samplers" : {}, // sampler variables
        "vert" : null,
        "frag" : null,
        "ready" : false,
        "error" : false,
        "activate" : function () {
            var prog = this;
            if (prog.ready && !prog.error) {
                gl.useProgram(prog.id);

                // Update cache + unbind old attrs
                if (please.gl.__cache.current !== null) {
                    // FIXME: unbind old attributes
                }
                please.gl.__cache.current = this;

                // fetching info on available attribute vars from shader:
                var attr_count = gl.getProgramParameter(
                    prog.id, gl.ACTIVE_ATTRIBUTES);

                // store data about attributes
                for (var i=0; i<attr_count; i+=1) {
                    var attr = gl.getActiveAttrib(prog.id, i);
                    attr.loc = gl.getAttribLocation(prog.id, attr.name);
                    prog.attrs[attr.name] = attr;
                    gl.enableVertexAttribArray(attr.loc);
                }
            }
            else {
                throw(build_fail);
            }
        },
    };

    if (window.gl === undefined) {
        throw("No webgl context found.  Did you call please.gl.set_context?");
    }

    // sort through the shaders passed to this function
    var errors = [];
    for (var i=1; i< arguments.length; i+=1) {
        var shader = arguments[i];
        if (shader.type == gl.VERTEX_SHADER) {
            prog.vert = shader;
        }
        if (shader.type == gl.FRAGMENT_SHADER) {
            prog.frag = shader;
        }
        if (shader.error) {
            errors.push(shader.error);
            build_fail += "\n\n" + shader.error;
        }
    }
    if (errors.length > 0) {
        prog.error = errors;
        throw(build_fail);
    }

    // check for redundant build
    var another = please.gl.get_program(prog.name);
    if (another !== undefined) {
        if (another.vert.uri === prog.vert.uri && another.frag.uri === prog.frag.uri) {
            return another;
        }
        else {
            // FIXME: delete previous shader program
        }
    }

    // link the shader program
    prog.id = gl.createProgram();
    gl.attachShader(prog.id, prog.vert.id)
    gl.attachShader(prog.id, prog.frag.id)
    gl.linkProgram(prog.id);

    // uniform type map
    var u_map = {};
    u_map[gl.FLOAT] = "1fv";
    u_map[gl.FLOAT_VEC2] = "2fv";
    u_map[gl.FLOAT_VEC3] = "3fv";
    u_map[gl.FLOAT_VEC4] = "4fv";
    u_map[gl.FLOAT_MAT2] = "Matrix2fv";
    u_map[gl.FLOAT_MAT3] = "Matrix3fv";
    u_map[gl.FLOAT_MAT4] = "Matrix4fv";
    u_map[gl.INT] = "1iv";
    u_map[gl.INT_VEC2] = "2iv";
    u_map[gl.INT_VEC3] = "3iv";
    u_map[gl.INT_VEC4] = "4iv";
    u_map[gl.BOOL] = "1iv";
    u_map[gl.BOOL_VEC2] = "2iv";
    u_map[gl.BOOL_VEC3] = "3iv";
    u_map[gl.BOOL_VEC4] = "4iv";
    u_map[gl.SAMPLER_2D] = "1i";

    // 
    var sampler_uniforms = [];

    // create helper functions for uniform vars
    var bind_uniform = function (data) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size

        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.

        var pointer = gl.getUniformLocation(prog.id, data.name);
        var uni = "uniform" + u_map[data.type];
        var is_array = uni.endsWith("v");

        prog.vars.__defineSetter__(data.name, function (type_array) {
            // FIXME we could do some sanity checking here, eg, making
            // sure the array length is appropriate for the expected
            // call type
            if (typeof(type_array) === "number") {
                if (is_array) {
                    if (data.type === gl.FLOAT) {
                        return gl[uni](pointer, new Float32Array([type_array]));
                    }
                    else if (data.type === gl.INT || data.type === gl.BOOL) {
                        return gl[uni](pointer, new Int32Array([type_array]));
                    }
                }
                else {
                    // note, "type_array" is not an array, just a number
                    gl[uni](pointer, type_array);
                }
            }
            else if (data.type >= gl.FLOAT_MAT2 && data.type <= gl.FLOAT_MAT4) {
                // the 'transpose' arg is assumed to be false :P
                return gl[uni](pointer, false, type_array);
            }
            return gl[uni](pointer, type_array);
        });

        if (data.type === gl.SAMPLER_2D) {
            data.t_unit = sampler_uniforms.length;
            sampler_uniforms.push(data.name);
            data.t_symbol = gl["TEXTURE"+data.t_unit];
            if (!data.t_symbol) {
                console.error("Exceeded number of available texture units.  Doing nothing.");
                return;
            }

            prog.samplers.__defineSetter__(data.name, function (uri) {
                // FIXME: allow an option for a placeholder texture somehow.
                var t_id = please.gl.get_texture(uri);
                if (t_id !== null) {
                    gl.activeTexture(data.t_symbol);
                    gl.bindTexture(gl.TEXTURE_2D, t_id);
                    prog.vars[data.name] = data.t_unit;
                }
            });
        }
    };

    // fetch info on available uniform vars from shader:
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        bind_uniform(gl.getActiveUniform(prog.id, i));
    }

    prog.ready = true;
    please.gl.__cache.programs[prog.name] = prog;    
    return prog;
};


// JTA model loader.  This is just a quick-and-dirty implementation.
please.gl.__jta_model = function (src, uri) {
    // The structure of a JTA file is json.  Large blocks of agregate
    // data are base64 encoded binary data.

    var directory = JSON.parse(src);
    var groups = directory["vertex_groups"];
    var uniforms = directory["vars"];
    var model = {
        "__groups" : [],
        "uniforms" : {},

        "bind" : function () {
            for (var i=0; i<this.__groups.length; i+=1) {
                this.__groups[i].bind();
            }
        },

        "draw" : function () {
            for (var i=0; i<this.__groups.length; i+=1) {
                this.__groups[i].draw();
            }
        },
    };

    // Note suggested uniform values, unpack data, and possibly queue
    // up additional image downloads:
    please.get_properties(uniforms).map(function(name) {
        var meta = uniforms[name];
        if (meta.hint === "Sampler2D") {
            var uri;
            if (meta.mode === "linked") {
                uri = meta.uri;
                if (please.gl.relative_lookup) {
                    please.relative_load("img", uri);

                }
                else {
                    please.load("img", uri);                    
                }
            }
            else if (meta.mode === "packed") {
                uri = meta.md5;
                if (!please.access(uri, true)) {
                    var img = new Image();
                    img.src = meta.uri;
                    please.media.assets[uri] = img;
                }
            }
            else {
                console.error("Cannot load texture of type: " + meta.mode);
            }
            if (uri) {
                model.uniforms[name] = uri;
            }
        }
        else {
            console.warn("Not implemented: " + meta.hint);
        }
    });

    // Create our attribute lists.  Closure to avoid scope polution.
    please.get_properties(groups).map(function(name) {
        var group = {
            "vbo" : null,
            "faces" : 0,
        };

        var tmp = {};
        var offset = 0;
        var buffer_size = 0;
        var bind_order = [];
        var bind_offset = [];
        var vertices = groups[name];

        if (!vertices.position) {
            throw("JTA model " + uri + " is missing the 'position' attribute!!");
        }

        // FIXME: item_size 4 attrs should be first, followed by the
        // size 2 attrs, the 3 and 1 sized attrs.  Some kind of snake
        // oil optimization for OpenGL ES that I see a lot, but
        // haven't found a practical explanation for yet.
        for (var attr in vertices) {
            var hint = vertices[attr].hint;
            var raw = vertices[attr].data;
            tmp[attr] = {
                "data" : new Float32Array(please.gl.array_buffer(raw)),
                "item_size" : vertices[attr].size,
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
            buffer_size += tmp[attr].data.length;

            bind_order.push(attr);
            bind_offset.push(offset);
            offset += tmp[attr].item_size;
        }

        // Determine the face count for this vertex group:
        group.faces = tmp.position.data.length / tmp.position.item_size;

        // Calculate the packing stride:
        var stride = offset;
        // FIXME: See above snake oil optimization: the stride can be
        // padded to make the indices line up to 4 or 8 or something
        // :P


        // build the interlaced vertex array:
        var builder = new Float32Array(buffer_size);
        for (var i=0; i<bind_order.length; i+=1) {
            var attr = tmp[bind_order[i]];
            for (var k=0; k<attr.data.length/attr.item_size; k+=1) {
                for (var n=0; n<attr.item_size; n+=1) {
                    var attr_offset = bind_offset[i] + (stride*k);
                    builder[attr_offset+n] = attr.data[(k*attr.item_size)+n];
                }
            }

            // free up now unused memory:
            delete tmp[bind_order[i]].data;
        }

        // Create the VBO
        group.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, group.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, builder, gl.STATIC_DRAW);
        console.info("Created VBO for: " + uri + ":" + name);

        // Bind function to set up the array for drawing:
        group.bind = function () {
            var prog = please.gl.__cache.current;
            if (prog) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
                for (var i=0; i<bind_order.length; i+=1) {
                    var attr = bind_order[i];
                    var offset = bind_offset[i];
                    var item_size = tmp[attr].item_size;
                    if (prog.attrs[attr]) {
                        gl.vertexAttribPointer(
                            prog.attrs[attr].loc, item_size, 
                            gl.FLOAT, false, stride*4, offset*4);
                    }
                }
            }
        };

        // Draw function:
        group.draw = function () {
            gl.drawArrays(gl.TRIANGLES, 0, this.faces);
        };
        
        model.__groups.push(group);
    });

    return model;
};


// Draws a quad with the given coordinates.
please.gl.draw_quad = function (x1, y2, x2, y2, z) {
    if (please.gl.__cache.quad === null) {
        please.gl.__cache.quad = gl.createBuffer();
    }
    var vbo_id = please.gl.__cache.quad;
    var prog = please.gl.get_program();
    var data = new Float32Array([x2, y2, z, x1, y2, z, x2, y1, z, x1, y1, z]);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo_id);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(prog.attrs.position.loc, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
};