// - m.gl.js ------------------------------------------------------------- //


// "glsl" media type handler
please.media.search_paths.glsl = "",
please.media.handlers.glsl = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = please.gl.__build_shader(req.response, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};


// Namespace for m.gl guts
please.gl = {
    "canvas" : null,
    "ctx" : null,
    "ext" : {},
    "__cache" : {
        "current" : null,
        "programs" : {},
        "textures" : {},
    },
    
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
            
            // look for common extensions
            var search = [
                'EXT_texture_filter_anisotropic',
                'OES_element_index_uint',
            ];
            for (var i=0; i<search.length; i+=1) {
                var name = search[i];
                var found = gl.getExtension(name);
                if (found) {
                    this.ext[name] = found;
                }
            }
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
};


// Helper function for creating texture objects from the asset cache.
// Implies please.load etc:
please.gl.get_texture = function (uri, use_placeholder, no_error) {

    // Check for textures that were not created from image assets:
    if (please.gl.__cache.textures[uri]) {
        return please.gl.__cache.textures[uri];
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
        please.load(uri, function (state, uri) {
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


// Upscale an image to the next power of 2
please.gl.__upscale_image = function (image_object) {
    var wlog = Math.log2(image_object.width);
    var hlog = Math.log2(image_object.height);
    var w_ok = Math.floor(wlog) === wlog;
    var h_ok = Math.floor(hlog) === hlog;
    if (w_ok && h_ok) {
        return image_object;
    }
    var next_w = Math.pow(2, Math.ceil(wlog));
    var next_h = Math.pow(2, Math.ceil(hlog));

    var canvas = document.createElement("canvas");
    canvas.width = next_w;
    canvas.height = next_h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(image_object, 0, 0, next_w, next_h);
    return canvas;
};


// Used by please.gl.get_texture
please.gl.__build_texture = function (uri, image_object, use_mipmaps) {
    // bind and load the texture, cache and return the id:

    if (use_mipmaps === undefined) {
        use_mipmaps = true;
    }

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
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        // FIXME: should we not assume gl.RGBA?
        var upscaled = please.gl.__upscale_image(image_object);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, 
                      gl.UNSIGNED_BYTE, upscaled);

        if (use_mipmaps) {
            var aniso = please.gl.ext['EXT_texture_filter_anisotropic'];
            if (aniso) {
                gl.texParameterf(
                    gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT,
                    gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
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
        "__cache" : {
            // the cache records the last value set,
            "vars" : {},
            "samplers" : {},
        },
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

    // check for erros while linking
    var program_info_log = gl.getProgramInfoLog(prog.id);
    if (program_info_log) {
        console.warn(program_info_log);
    }

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

        // FIXME - set defaults per data type
        prog.__cache.vars[data.name] = null;

        prog.vars.__defineSetter__(data.name, function (type_array) {
            // FIXME we could do some sanity checking here, eg, making
            // sure the array length is appropriate for the expected
            // call type

            if (type_array === prog.__cache.vars[data.name] && type_array.dirty === false) {
                return;
            }

            var value = type_array;
            if (typeof(type_array) === "number") {
                if (is_array) {
                    if (data.type === gl.FLOAT) {
                        value = new Float32Array([type_array]);
                    }
                    else if (data.type === gl.INT || data.type === gl.BOOL) {
                        value = new Int32Array([type_array]);
                    }
                }
            }

            // Cache the value to be saved.  Note that type arrays are
            // compared as pointers, so changing the type array will
            // also change this value.  Setting value.dirty is sort of
            // a work around to allow the end user to flag that the
            // cached value has expired.
            try {
                // catch statement is a fix for when running this in a
                // pywebkit shell
                value.dirty = false;
            }
            catch (err) {}
            prog.__cache.vars[data.name] = value;

            if (data.type >= gl.FLOAT_MAT2 && data.type <= gl.FLOAT_MAT4) {
                // the 'transpose' arg is assumed to be false :P
                return gl[uni](pointer, false, value);
            }
            return gl[uni](pointer, value);
        });

        prog.vars.__defineGetter__(data.name, function () {
            return prog.__cache.vars[data.name];
        });

        if (data.type === gl.SAMPLER_2D) {
            data.t_unit = sampler_uniforms.length;
            sampler_uniforms.push(data.name);
            data.t_symbol = gl["TEXTURE"+data.t_unit];
            if (!data.t_symbol) {
                console.error("Exceeded number of available texture units.  Doing nothing.");
                return;
            }

            prog.__cache.samplers[data.name] = null;

            prog.samplers.__defineSetter__(data.name, function (uri) {
                // FIXME: allow an option for a placeholder texture somehow.

                if (uri === prog.__cache.samplers[data.name]) {
                    // redundant state change, do nothing
                    return;
                }

                var t_id = please.gl.get_texture(uri);
                if (t_id !== null) {
                    gl.activeTexture(data.t_symbol);
                    gl.bindTexture(gl.TEXTURE_2D, t_id);
                    prog.vars[data.name] = data.t_unit;
                    prog.__cache.samplers[data.name] = uri;
                }
            });

            prog.samplers.__defineGetter__(data.name, function () {
                return prog.__cache.samplers[data.name];
            });
        }
    };

    // fetch info on available uniform vars from shader:
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        bind_uniform(gl.getActiveUniform(prog.id, i));
    }
    
    // leaving these commented out for now, because the error message
    // they produce is too cryptic
    //Object.freeze(prog.vars);
    //Object.freeze(prog.samplers);

    prog.ready = true;
    please.gl.__cache.programs[prog.name] = prog;    
    return prog;
};


// Create a VBO from attribute array data.
please.gl.__last_vbo = null;
please.gl.vbo = function (vertex_count, attr_map, options) {
    var opt = {
        "type" : gl.FLOAT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }

    var vbo = {
        "id" : null,
        "opt" : opt,
        "count" : vertex_count,
        "bind" : function () {},
        "draw" : function () {
            gl.drawArrays(opt.mode, 0, this.count);
        },
    };

    var attr_names = please.get_properties(attr_map);
    if (attr_names.length === 1) {
        // ---- create a monolithic VBO

        var attr = attr_names[0];
        var data = attr_map(attr);
        var item_size = data.length / vbo.count;
        
        // copy the data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, data, opt.hint);
        
        vbo.bind = function () {
            if (please.gl.__last_vbo !== this) {
                please.gl.__last_vbo = this
                var prog = please.gl.__cache.current;
                if (prog && prog.hasOwnProperty(prog.attrs[attr])) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                    gl.vertexAttribPointer(
                        prog.attrs[attr].loc, item_size, opt.type, false, 0, 0);
                }
            }
        };

    }
    else {
        // ---- create an interlaced VBO

        var offset = 0;
        var buffer_size = 0;
        var bind_order = [];
        var bind_offset = [];
        var item_sizes = {};

        // FIXME: item_size 4 attrs should be first, followed by the
        // size 2 attrs, the 3 and 1 sized attrs.  Some kind of snake
        // oil optimization for OpenGL ES that I see a lot, but
        // haven't found a practical explanation for yet, so not
        // worrying about it for now.

        // determine item sizes and bind offsets
        for (var i=0; i<attr_names.length; i+=1) {
            var attr = attr_names[i];
            item_sizes[attr] = attr_map[attr].length / vbo.count;
            buffer_size += attr_map[attr].length;
            bind_order.push(attr);
            bind_offset.push(offset);
            offset += item_sizes[attr];
        };

        // calculate the packing stride
        var stride = offset;

        // build the interlaced vertex array:
        var builder = new Float32Array(buffer_size);
        for (var i=0; i<bind_order.length; i+=1) {
            var attr = bind_order[i];
            var data = attr_map[attr];
            var item_size = item_sizes[attr];
            for (var k=0; k<data.length/item_size; k+=1) {
                for (var n=0; n<item_sizes[attr]; n+=1) {
                    var attr_offset = bind_offset[i] + (stride*k);
                    builder[attr_offset+n] = data[(k*item_sizes[attr])+n];
                }
            }
        }

        // copy the new data to the buffer
        vbo.id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo.id);
        gl.bufferData(gl.ARRAY_BUFFER, builder, opt.hint);

        vbo.bind = function () {
            if (please.gl.__last_vbo !== this) {
                please.gl.__last_vbo = this
                var prog = please.gl.__cache.current;
                if (prog) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                    for (var i=0; i<bind_order.length; i+=1) {
                        var attr = bind_order[i];
                        var offset = bind_offset[i];
                        var item_size = item_sizes[attr];
                        if (prog.attrs[attr]) {
                            gl.vertexAttribPointer(
                                prog.attrs[attr].loc, item_size, 
                                opt.type, false, stride*4, offset*4);
                        }
                    }
                }
            }
        }
    }
    return vbo;
};


// Create a IBO.
please.gl.__last_ibo = null;
please.gl.ibo = function (data, options) {
    var opt = {
        "type" : gl.UNSIGNED_SHORT,
        "mode" : gl.TRIANGLES,
        "hint" : gl.STATIC_DRAW,
    }
    if (options) {
        please.get_properties(opt).map(function (name) {
            if (options.hasOwnProperty(name)) {
                opt[name] = options[name];
            }
        });
    }
    if (data.BYTES_PER_ELEMENT == 2) {
        opt["type"] = gl.UNSIGNED_SHORT;
    }
    else if (data.BYTES_PER_ELEMENT == 4) {
        opt["type"] = gl.UNSIGNED_INT;
    }
    var poly_size = 3; // fixme this should be determined by opt.mode
    var face_count = data.length;
    var ibo = {
        "id" : gl.createBuffer(),
        "bind" : function () {
            if (please.gl.__last_ibo !== this) {
                please.gl.__last_ibo = this
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.id);
            }
        },
        "draw" : function (start, total) {
            if (start === undefined || total === undefined) {
                start = 0;
                total = face_count;
            }
            gl.drawElements(opt.mode, total, opt.type, start*data.BYTES_PER_ELEMENT);
        }
    };
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo.id);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, opt.hint);
    return ibo;
};


// Create and return a vertex buffer object containing a square.
please.gl.make_quad = function (width, height, origin, draw_hint) {

    if (!origin) {
        origin = [0, 0, 0];
    }
    console.assert(origin.length === 3, "Origin must be in the form [0, 0, 0].");
    if (!width) {
        width = 2;
    }
    if (!height) {
        height = 2;
    }
    if (!draw_hint) {
        draw_hint = gl.STATIC_DRAW;
    }
    
    var x1 = origin[0] + (width/2);
    var x2 = origin[0] - (width/2);
    var y1 = origin[1] + (height/2);
    var y2 = origin[1] - (height/2);
    var z = origin[2];

    var attr_map = {};
    attr_map.position = new Float32Array([
        x1, y1, z,
        x2, y1, z,
        x2, y2, z,
        x2, y2, z,
        x1, y2, z,
        x1, y1, z,
    ]);
    attr_map.normal = new Float32Array([
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
    ]);

    return please.gl.vbo(6, attr_map, {"hint" : draw_hint});
};
