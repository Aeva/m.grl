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
    "__macros" : [],
};


// [+] please.gl.set_context(canvas_id, options)
//
// This function is used for setting the current rendering context
// (which canvas element M.GRL will be drawing to), as well as
// creating the "gl" namespace, which is used extensively by M.GRL,
// and therefor this function is usually the first thing your program
// should call.
//
// The "options" paramater is an object which is passed to the
// canvas.getContext function, but may be omitted if you do not wish
// to initialize the rendering context with any special options.  For
// more details see:
//
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
//
please.gl.set_context = function (canvas_id, options) {
    if (this.canvas !== null) {
        throw("This library is not presently designed to work with multiple contexts.");
    }

    this.canvas = document.getElementById(canvas_id);
    please.__create_canvas_overlay();
    try {
        var names = ["webgl", "experimental-webgl"];
        for (var n=0; n<names.length; n+=1) {
            var opt = options || {};
            this.ctx = this.canvas.getContext(names[n], opt);
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

        // set mgrl's default gl state settings:
        // - enable alpha blending
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
            gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

        // fire an event to indicate that a gl context exists now
        var ctx_event = new CustomEvent("mgrl_gl_context_created");
        window.dispatchEvent(ctx_event);

        // create the picking shader
        please.glsl("object_picking", "simple.vert", "picking.frag");

        // create the default shader
        please.glsl("default", "simple.vert", "diffuse.frag").activate();
    }
},


// [+] please.gl.get_program(name)
//
// Returns an object representing a compiled shader program.
//
// If 'name' is null, the currently active shader program is returned,
// if applicable.
//
// If 'name' is a string, then this function returns the shader
// program that shares the same name.
//
// If 'name' is an array of source URI, then this function will return
// a shader program that was built from the named sources if one
// exists.
//
// If no applicable shader program can be found, this function returns
// null.
//
please.gl.get_program = function (name) {
    if (typeof(name) === "string") {
        return this.__cache.programs[name];
    }
    else if (!name) {
        return this.__cache.current;
    }
    else if (typeof(name) === "object") {
        // find by shader uris
        var vert = null;
        var frag = null;
        ITER(i, name) {
            var uri = name[i];
            if (uri.endsWith(".vert")) {
                vert = uri;
            }
            else if (uri.endsWith(".frag")) {
                frag = uri;
            }
        }
        ITER_PROPS(name, this.__cache.programs) {
            var prog = this.__cache.programs[name];
            if (prog.vert.uri == vert && prog.frag.uri == frag) {
                return prog;
            }
        }
        return null;
    }
};


// [+] please.set_clear_color(red, green, blue, alpha)
//
// This function wraps gl.clearColor.  You should use this version if
// you want mgrl to automatically set the "mgrl_clear_color" uniform
// in your shader program.
//
please.__clear_color = [0.0, 0.0, 0.0, 1.0];
please.set_clear_color = function (red, green, blue, alpha) {
    var channels = [red, green, blue, alpha];
    var defaults = [0.0, 0.0, 0.0, 1.0];
    var color = channels.map(function (channel, i) {
        return channel === undefined ? defaults[i] : channel;
    });
    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_clear_color = please.__clear_color = color;
    }
    if (window.gl) {
        gl.clearColor.apply(gl, color);
    }
}


// [+] please.gl.get_texture(uri, use_placeholder, no_error)
//
// Helper function for creating texture objects from the asset cache.
// Calls please.load if the uri was not already loaded.  This method
// is mostly used internally.
//
please.gl.get_texture = function (uri, use_placeholder, no_error) {

    // See if we already have a texture object for the uri:
    var texture = please.gl.__cache.textures[uri];
    if (texture) {
        return texture;
    }

    // No texture, now we check to see if the asset is present:
    var asset;
    if (uri === "error") {
        asset = please.media.errors["img"];
    }
    else {
        asset = please.access(uri, true);
    }
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


// [+] please.gl.nearest_power(number)
//
// Returns the lowest power of two that is greater than or equal to
// the number passed to this function.
//
please.gl.nearest_power = function (num) {
    var log_n = Math.log2(num);
    if (Math.floor(log_n) === num) {
        return num;
    }
    else {
        return Math.pow(2, Math.ceil(log_n));
    }
};


// Upscale an image to the next power of 2
please.gl.__upscale_image = function (image_object) {
    var w = image_object.width;
    var h = image_object.height;
    var next_w = please.gl.nearest_power(w);
    var next_h = please.gl.nearest_power(h);

    if (w === next_w && h === next_h) {
        return image_object;
    }

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

    var scale_mode = "LINEAR";
    if (image_object.scale_filter) {
        scale_mode = image_object.scale_filter;
        use_mipmaps = false;
    }

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
        else if (scale_mode === "LINEAR") {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        else if (scale_mode === "NEAREST") {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);

        please.gl.__cache.textures[uri] = tid;
        return tid;
    }
    else {
        return please.gl.__cache.textures[uri];
    }
};


//
// mechanism for applying all registered glsl macros, in order, to a
// given body of code.
//
please.gl.apply_glsl_macros = function (src) {
    ITER(i, please.gl.__macros) {
        src = please.gl.__macros[i](src);
    }
    return src;
};


// Constructor function for GLSL Shaders
please.gl.__build_shader = function (src, uri) {
    var glsl = {
        "id" : null,
        "type" : null,
        "src" : please.gl.apply_glsl_macros(src),
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
            var line, lines = glsl.src.split("\n");
            var line_label, debug = [];
            ITER(i, lines) {
                line = lines[i];
                if (line.trim().length) {
                    line_label = String(i+1);
                    while (line_label.length < String(lines.length).length) {
                        line_label = " " + line_label;
                    }
                    debug.push(line_label + " | " + line);
                }
            }
            console.debug(
                "----- semicompiled shader ----------------\n" + debug.join("\n"));
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


//
// This function takes a path/curve function and a uniform discription
// object and returns a flat array containing uniform samples of the path.
//
please.gl.__flatten_path = function(path, data) {
    // data.type -> built in gl type enum
    // data.size -> array size

    var acc = [];
    var step = 1.0/(data.size-1);
    var sample, alpha = 0.0;
    for (var i=0; i<data.size; i+=1) {
        sample = path(alpha);
        if (sample.length) {
            ITER(k, sample) {
                acc.push(sample[k]);
            }
        }
        else {
            acc.push(sample);
        }
        alpha += step;
    }
    return acc;
};


// [+] please.glsl(name /*, shader_a, shader_b,... */)
//
// Constructor function for building a shader program.  Give the
// program a name (for caching), and pass any number of shader objects
// to the function.
//
please.glsl = function (name /*, shader_a, shader_b,... */) {
    if (window.gl === undefined) {
        throw("No webgl context found.  Did you call please.gl.set_context?");
    }

    var build_fail = "Shader could not be activated..?";

    var prog = {
        "name" : name,
        "id" : null,
        "vars" : {}, // uniform variables
        "attrs" : {}, // attribute variables
        "samplers" : {}, // sampler variables
        "uniform_list" : [], // immutable, canonical list of uniform var names
        "sampler_list" : [], // immutable, canonical list of sampler var names
        "binding_info" : {}, // lookup reference for variable bindings
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
            var old = null;
            var prog = this;
            if (prog.ready && !prog.error) {
                if (please.gl.__cache.current !== this) {
                    // change shader program
                    gl.useProgram(prog.id);
                    // update the cache pointer
                    old = please.gl.__cache.current;
                    please.gl.__cache.current = this;
                }
            }
            else {
                throw(build_fail);
            }
            if (old) {
                // trigger things to be rebound if neccesary
                var shader_event = new CustomEvent("mgrl_changed_shader");
                shader_event.old_program = old;
                shader_event.new_program = prog;
                window.dispatchEvent(shader_event);

                // copy over defaults from the last pass
                ITER_PROPS(prop, old.vars) {
                    if (old.vars[prop]) {
                        if (old.vars[prop].hasOwnProperty("dirty")) {
                            old.vars[prop].dirty = true;
                        }
                        prog.vars[prop] = old.vars[prop];
                    }
                }

                // drop the sampler cache
                prog.__cache.samplers = {};

                // regenerate the viewport
                please.gl.reset_viewport();
            }
        },
    };

    // sort through the shaders passed to this function
    var errors = [];
    for (var i=1; i< arguments.length; i+=1) {
        var shader = arguments[i];
        if (typeof(shader) === "string") {
            shader = please.access(shader);
        }
        if (shader) {
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
    }
    if (!prog.vert) {
        throw("No vertex shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your vertex shader?");
    }
    if (!prog.frag) {
        throw("No fragment shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your fragment shader?");
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
    u_map[gl.SAMPLER_2D] = "1iv";

    // 
    var sampler_uniforms = [];

    // create helper functions for uniform vars
    var bind_uniform = function (data, binding_name) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size

        // binding_name is usually data.name, but differs for array

        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.

        var pointer = gl.getUniformLocation(prog.id, data.name);
        var uni = "uniform" + u_map[data.type];
        var non_sampler = data.type !== gl.SAMPLER_2D;
        var is_array = data.size > 1;

        // FIXME - set defaults per data type
        prog.__cache.vars[binding_name] = null;

        prog.uniform_list.push(binding_name);

        var setter_method;
        if (non_sampler) {
            if (uni.startsWith("uniform1") && !is_array) {
                if (data.type === gl.FLOAT) {
                    // Setter for float type uniforms.
                    setter_method = function (value) {
                        var number, upload = value;
                        if (value.length === undefined) {
                            number = value;
                            upload = new Float32Array([value]);
                        }
                        else {
                            number = value[0];
                        }
                        if (prog.__cache.vars[binding_name] !== number) {
                            prog.__cache.vars[binding_name] = number;
                            return gl[uni](pointer, upload);
                        }
                    }
                }
                else if (data.type === gl.INT || data.type === gl.BOOL) {
                    // Setter for int and bool type uniforms.
                    setter_method = function (value) {
                        var number, upload = value;
                        if (value.length === undefined) {
                            number = value;
                            upload = new Int32Array([value]);
                        }
                        else {
                            number = value[0];
                        }
                        if (prog.__cache.vars[binding_name] !== number) {
                            prog.__cache.vars[binding_name] = number;
                            return gl[uni](pointer, upload);
                        }
                    }
                }
            }
            else {
                if (data.type >= gl.FLOAT_MAT2 && data.type <= gl.FLOAT_MAT4) {
                    // Setter method for matrices.
                    setter_method = function (value) {
                        // the 'transpose' arg is assumed to be false :P
                        return gl[uni](pointer, false, value);
                    }
                }
                else {
                    // Setter method for vectors and arbitrary arrays.  In this
                    // case we don't bother checking the cache as the performance
                    // gains in doing so are dubious.  We still set it, though, so
                    // that the corresponding getter still works.
                    setter_method = function (value) {
                        if (typeof(value) === "function" && value.stops) {
                            value = please.gl.__flatten_path(value, data);
                        }
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, value);
                    }
                }
            }
        }
        else {
            if (!is_array) {
                // This is the setter binding for sampler type uniforms variables.
                setter_method = function (value) {
                    if (prog.__cache.vars[binding_name] !== value) {
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, new Int32Array([value]));
                    }
                };
            }
            else {
                // This is the setter binding for sampler arrays.
                setter_method = function (value) {
                    if (prog.__cache.vars[binding_name] !== value) {
                        prog.__cache.vars[binding_name] = value;
                        return gl[uni](pointer, value);
                    }
                };
            }
        }
        prog.vars.__defineSetter__(binding_name, setter_method);
        
        
        prog.vars.__defineGetter__(binding_name, function () {
            if (prog.__cache.vars[binding_name] !== null) {
                if (data.type === gl.BOOL) {
                    return prog.__cache.vars[binding_name][0];
                }
                else if (data.type === gl.FLOAT || data.type === gl.INT) {
                    prog.__cache.vars[binding_name][0];
                }
            }
            return prog.__cache.vars[binding_name];
        });

        if (data.type === gl.SAMPLER_2D) {
            data.t_unit = sampler_uniforms.length;
            prog.sampler_list.push(binding_name);
            sampler_uniforms.push(binding_name);
            data.t_symbol = gl["TEXTURE"+data.t_unit];
            if (!data.t_symbol) {
                console.error("Exceeded number of available texture units.  Doing nothing.");
                return;
            }

            prog.__cache.samplers[binding_name] = null;

            prog.samplers.__defineSetter__(binding_name, function (uri) {
                // FIXME: allow an option for a placeholder texture somehow.

                if (uri.constructor === Array) {
                    // FIXME: texture array upload
                    //
                    // var t_id, t_id_set = [];
                    // ITER(i, uri) {
                    //     t_id = please.gl.get_texture(uri[i]);
                    //     if (t_id !== null) {
                    //         gl.activeTexture(data.t_symbol);
                    //         gl.bindTexture(gl.TEXTURE_2D, t_id);
                    //     }
                    // }
                }
                else {
                    if (uri === prog.__cache.samplers[binding_name]) {
                        // redundant state change, do nothing
                        return;
                    }

                    var t_id = please.gl.get_texture(uri);
                    if (t_id !== null) {
                        gl.activeTexture(data.t_symbol);
                        gl.bindTexture(gl.TEXTURE_2D, t_id);
                        prog.vars[binding_name] = data.t_unit;
                        prog.__cache.samplers[binding_name] = uri;
                    }
                }
            });

            prog.samplers.__defineGetter__(binding_name, function () {
                return prog.__cache.samplers[binding_name];
            });
        }
    };

    // fetch info on available uniform vars from shader:
    var uni_count = gl.getProgramParameter(prog.id, gl.ACTIVE_UNIFORMS);
    for (var i=0; i<uni_count; i+=1) {
        var uniform_data = gl.getActiveUniform(prog.id, i)
        var binding_name = uniform_data.name;
        if (binding_name.endsWith("[0]")) {
            binding_name = binding_name.slice(0,-3);
        }
        bind_uniform(uniform_data, binding_name);
        // store this data so that we can introspect elsewhere
        prog.binding_info[uniform_data.name, binding_name] = uniform_data;
    }

    // create handlers for available attributes + getter/setter for
    // enabling/disabling them
    var bind_attribute = function(attr) {
        var state = false;
        attr.loc = gl.getAttribLocation(prog.id, attr.name);

        Object.defineProperty(attr, "enabled", {
            enumerable: true,
            get : function () {
                return state;
            },
            set : function (value) {
                if (value != state) {
                    state = !state;
                    if (state) {
                        gl.enableVertexAttribArray(attr.loc);
                    }
                    else {
                        gl.disableVertexAttribArray(attr.loc);
                    }
                }
            },
        });

        prog.attrs[attr.name] = attr;
    };

    // fetching info on available attribute vars from shader:
    var attr_count = gl.getProgramParameter(prog.id, gl.ACTIVE_ATTRIBUTES);

    // store data about attributes
    for (var i=0; i<attr_count; i+=1) {
        var attr = gl.getActiveAttrib(prog.id, i);
        bind_attribute(attr);
    }
    
    // leaving these commented out for now, because the error message
    // they produce is too cryptic
    //Object.freeze(prog.vars);
    //Object.freeze(prog.samplers);

    // this should never be written to anyway
    Object.freeze(prog.uniform_list);

    prog.ready = true;
    please.gl.__cache.programs[prog.name] = prog;    
    return prog;
};


// [+] please.gl.vbo(vertex_count, attr_map, options)
//
// Create a VBO from attribute array data.
//
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
        "stats" : {
            "min" : null,
            "max" : null,
            "size" : null,
            "average" : null,
        },
    };

    if (attr_map.position !== undefined) {
        var point, sum = null;
        var channels = attr_map.position.length / vertex_count;
        for(var i=0; i<vertex_count*channels; i+=channels) {
            point = attr_map.position.slice(i, i+channels);
            if (sum === null) {
                // We call point.slice() here to copy the array's contents.
                // Otherwise, we'll just be editing references to the same object.
                sum = point.slice();
                vbo.stats.min = point.slice();
                vbo.stats.max = point.slice();
            }
            else {
                for (var ch=0; ch<channels; ch+=1) {
                    sum[ch] += point[ch];
                    if (point[ch] < vbo.stats.min[ch]) {
                        vbo.stats.min[ch] = point[ch];
                    }
                    if (point[ch] > vbo.stats.max[ch]) {
                        vbo.stats.max[ch] = point[ch];
                    }
                }
            }
        }
        vbo.stats.size = [];
        vbo.stats.average = [];
        for (var ch=0; ch<channels; ch+=1) {
            vbo.stats.size.push(vbo.stats.max[ch] - vbo.stats.min[ch]);
            vbo.stats.average.push(sum[ch] / vertex_count);
        }
    }
    var bind_stats = function (prog) {
        for (var name in vbo.stats) {
            var glsl_name = "mgrl_model_local_" + name;
            if (prog.vars.hasOwnProperty(glsl_name)) {
                prog.vars[glsl_name] = vbo.stats[name];
            }
        }
    };

    var attr_names = please.get_properties(attr_map);

    // This is used to automatically disable and enable attributes
    // when neccesary
    var setup_attrs = function (prog) {
        for (var name in prog.attrs) {
            if (attr_names.indexOf(name) === -1) {
                prog.attrs[name].enabled = false;
            }
            else {
                prog.attrs[name].enabled = true;
            }
        }
    };

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
                if (prog) {
                    setup_attrs(prog);
                    bind_stats(prog);
                    if (prog.hasOwnProperty(prog.attrs[attr])) {
                        gl.bindBuffer(gl.ARRAY_BUFFER, this.id);
                        gl.vertexAttribPointer(
                            prog.attrs[attr].loc, item_size, opt.type, false, 0, 0);
                    }
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
                    setup_attrs(prog);
                    bind_stats(prog);
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


// [+] please.gl.ibo(data, options)
//
// Create a IBO.
//
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


// [+] please.gl.register_framebuffer(handle, options)
//
// Create a new render texture
//
please.gl.register_framebuffer = function (handle, _options) {
    if (please.gl.__cache.textures[handle]) {
        throw("Cannot register framebuffer to occupied handel: " + handle);
    }

    // Set the framebuffer options.
    var opt = {
        "width" : 512,
        "height" : 512,
        "mag_filter" : gl.NEAREST,
        "min_filter" : gl.NEAREST,
        "pixel_format" : gl.RGBA,
    };
    if (_options) {
        please.prop_map(_options, function (key, value) {
            if (opt.hasOwnProperty(key)) {
                opt[key] = value;
            }
        });
    }
    opt.width = please.gl.nearest_power(opt.width);
    opt.height = please.gl.nearest_power(opt.height);
    Object.freeze(opt);

    // Create the new framebuffer
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    fbo.options = opt;
    
    // Create the new render texture
    var tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.mag_filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.min_filter);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, opt.width, opt.height, 0, 
                  opt.pixel_format, gl.UNSIGNED_BYTE, null);

    // Create the new renderbuffer
    var render = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, render);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, opt.width, opt.height);

    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, render);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    please.gl.__cache.textures[handle] = tex;
    please.gl.__cache.textures[handle].fbo = fbo;

    return tex;
};


// [+] please.gl.set_framebuffer(handle)
//
// Set the current render target.  If 'handle' is null, then direct
// rendering will be used.
//
please.gl.__last_fbo = null;
please.gl.set_framebuffer = function (handle) {
    if (handle === please.gl.__last_fbo) {
        return;
    }
    please.gl.__last_fbo = handle;
    var prog = please.gl.__cache.current;
    if (!handle) {
        var width = prog.vars.mgrl_buffer_width = please.gl.canvas.width;
        var height = prog.vars.mgrl_buffer_height = please.gl.canvas.height;
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
    }
    else {
        var tex = please.gl.__cache.textures[handle];
        if (tex && tex.fbo) {
            var width = prog.vars.mgrl_buffer_width = tex.fbo.options.width;
            var height = prog.vars.mgrl_buffer_height = tex.fbo.options.height;
            gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fbo);
            gl.viewport(0, 0, width, height);
        }
        else {
            throw ("No framebuffer registered for " + handle);
        }
    }
};


// [+] please.gl.reset_viewport()
//
// Reset the viewport dimensions so that they are synced with the
// rendering canvas's dimensions.
//
// Usually, this function is called when the canvas has been resized.
//
please.gl.reset_viewport = function () {
    var prog = please.gl.__cache.current;
    if (prog) {
        if (please.gl.__last_fbo === null) {
            var width = prog.vars.mgrl_buffer_width = please.gl.canvas.width;
            var height = prog.vars.mgrl_buffer_height = please.gl.canvas.height;
            gl.viewport(0, 0, width, height);
        }
        else {
            var opt = please.gl.__cache.textures[please.gl.__last_fbo].fbo.options;
            var width = prog.vars.mgrl_buffer_width = opt.width;
            var height = prog.vars.mgrl_buffer_height = opt.height;
            gl.viewport(0, 0, width, height);
        }
    }
}


// [+] please.gl.make_quad (width, height, origin, draw_hint)
//
// Create and return a vertex buffer object containing a square.  This
// generates vertices and normals, but not texture coordinates.
//
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


// [+] please.gl.splat()
//
// Splat fills the screen with fragments.  Useful for postprocessing
// effects.
//
please.gl.__splat_vbo = null;
please.gl.splat = function () {
    var prog = please.gl.__cache.current;
    var view_matrix = mat4.create();
    var world_matrix = mat4.create();
    var projection_matrix = mat4.create();

    mat4.lookAt(view_matrix, 
                [0, 0, -1], // eye
                [0, 0, 0], // center
                [0, 1, 0]); // up
    mat4.ortho(projection_matrix, 
               -1, 1,
               1, -1,
               .1, 100);

    view_matrix.dirty = true;
    world_matrix.dirty = true;
    projection_matrix.dirty = true;

    prog.vars.view_matrix = view_matrix;
    prog.vars.world_matrix = world_matrix;
    prog.vars.projection_matrix = projection_matrix;

    if (!please.gl.__splat_vbo) {
        please.gl.__splat_vbo = please.gl.make_quad(10, 10);
    }
    please.gl.__splat_vbo.bind();
    please.gl.__splat_vbo.draw();
};


// [+] please.gl.pick(x, y)
//
// Returns the RGBA formatted color value for the given x/y
// coordinates in the canvas.  X and Y are within the range 0.0 to 1.0.
//
please.gl.pick = function (x, y) {
    var x = Math.floor((please.gl.canvas.width-1) * x);
    var y = Math.floor((please.gl.canvas.height-1) * (1.0-y));
    var px = new Uint8Array(4);
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    return px;
}
