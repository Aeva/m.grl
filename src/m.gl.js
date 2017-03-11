// - m.gl.js ------------------------------------------------------------- //


// Namespace for webgl specific code
please.gl = {
    "canvas" : null,
    "ctx" : null,
    "ext" : {},
    "__cache" : {
        "current" : null,
        "programs" : {},
        "textures" : {},
    },
    "__debug" : {
#if DEBUG
        "active" : true,
        "framebuffer" : null,
#else
        "active" : window.location.hash === "#gldebug",
#endif
        "texture_units" : [],
    },
    "info" : {
        "MAX_VERTEX_ATTRIBS" : 0,
        "MAX_VERTEX_TEXTURE_IMAGE_UNITS" : 0,
        "MAX_VERTEX_UNIFORM_VECTORS" : 0,
        "MAX_FRAGMENT_UNIFORM_VECTORS" : 0,
        "MAX_VARYING_VECTORS" : 0,
        
        "MAX_TEXTURE_SIZE" : 0,
        "MAX_RENDERBUFFER_SIZE" : 0,
        "MAX_CUBE_MAP_TEXTURE_SIZE" : 0,
        
        "MAX_TEXTURE_IMAGE_UNITS" : 0,
        "MAX_COMBINED_TEXTURE_IMAGE_UNITS" : 0,
    },

    // shader vars to always set after changing shader program
    "__globals" : {
        "mgrl_frame_start" : 0,
    },

    // these might be unused?
    "name" : "gl",
    "overlay" : null,
};


please.gl.__add_error_handling = function (gl) {
    return gl;
};



// [+] please.gl.set_context(canvas_id, options)
//
// This function is used for setting the current rendering context
// (which canvas element M.GRL will be drawing to), as well as
// creating the "gl" namespace (window.gl, not please.gl), which is
// used extensively by M.GRL, and therefor this function is usually
// the first thing your program should call.
//
// Please note that this method can only be called once, and if it is
// called, please.dom.set_context may not be used.
//
// The "options" paramater is an object which is passed to the
// canvas.getContext function, but may be omitted if you do not wish
// to initialize the rendering context with any special options.  For
// more details see:
//
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
//
please.gl.set_context = function (canvas_id, options) {
    if (this.canvas !== null || please.renderer.name !== null) {
        throw new Error("Cannot initialize a second rendering context.");
    }

    please.renderer.name = "gl";
    Object.freeze(please.renderer.name);
    please.renderer.__defineGetter__("width", function () {
        return please.gl.canvas.width;
    });
    please.renderer.__defineGetter__("height", function () {
        return please.gl.canvas.height;
    });
    
    this.canvas = document.getElementById(canvas_id);
    please.__create_canvas_overlay(this.canvas);

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
        alert("Unable to create a WebGL rendering context.");
    }
    else {
        window.gl = this.ctx;
        ITER_PROPS(param_name, please.gl.info) {
            please.gl.info[param_name] = gl.getParameter(gl[param_name]);
        }
        Object.freeze(please.gl.info);
        if (this.__debug.active) {
            RANGE(i, please.gl.info.MAX_TEXTURE_IMAGE_UNITS) {
                this.__debug.texture_units.push(null);
            }
            
            // gl error strings from https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getError
            var gl_errors = {};
#define err(ID, MSG) gl_errors[this.ctx.ID] = MSG
            err(INVALID_ENUM, "INVALID_ENUM: An unacceptable value has been specified for an enumerated argument.");
            err(INVALID_VALUE, "INVALID_VALUE: A numeric argument is out of range.");
            err(INVALID_OPERATION, "INVALID_OPERATION: The specified command is not allowed for the current state.");
            err(INVALID_FRAMEBUFFER_OPERATION, "INVALID_FRAMEBUFFER_OPERATION: The currently bound framebuffer is not framebuffer complete when trying to render to or to read from it.");
            err(OUT_OF_MEMORY, "Not enough memory is left to execute the command.");
            err(CONTEXT_LOST_WEBGL, "Rendering context lost.");
#undef err
            
            var debug_wrap = function (old_method) {
                return function () {
                    var result = old_method.apply(this, arguments);
                    var error = gl.getError();
                    if (error) {
                        var msg = "gl." + old_method.name;
                        msg += " caused the following WebGL Error:\n";
                        msg += (gl_errors[error] || "An unknown error occurred.");
                        throw new Error(msg);
                    }
                    return result;
                };
            }
            ITER_PROPS(prop, gl.constructor.prototype) {
                if (this.ctx[prop].constructor === Function && prop != "getError") {
                    this.ctx[prop] = debug_wrap(this.ctx[prop]);
                }
            }
        }
        
        // look for common extensions
        var search = [
            'EXT_texture_filter_anisotropic',
            'OES_element_index_uint',
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_texture_half_float',
            'OES_texture_half_float_linear',
            'WEBGL_depth_texture',
            'WEBGL_draw_buffers',
            'WEBGL_color_buffer_float',
            'WEBGL_color_buffer_half_float',
            'ANGLE_instanced_arrays',
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

        // enable depth testing
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // enable culling
        gl.enable(gl.CULL_FACE);

        // setup viewport
        please.gl.reset_viewport();

        // fire an event to indicate that a gl context exists now
        var ctx_event = new CustomEvent("mgrl_gl_context_created");
        window.dispatchEvent(ctx_event);

        // create the picking shader
        please.glsl("object_picking", "picking.vert", "picking.frag");

        // create the default shader
        please.glsl("default", "simple.vert", "diffuse.frag").activate();

        // initialize the picking system
        please.__init_picking();
    }
};


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
    if (uri.constructor !== String) {
        if (uri.__framebuffer_uri) {
            uri = uri.__framebuffer_uri;
        }
        else {
            throw new Error("Unable to get texture for object...?");
        }
    }

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

    var overflow_map = {
        "CLAMP" : gl.CLAMP_TO_EDGE,
        "REPEAT" : gl.REPEAT,
        "MIRROR" : gl.MIRRORED_REPEAT,
    };
    var find_overflow = function(req) {
        return req ? overflow_map[req] || null : null;
    };
    var overflow_x = find_overflow(image_object.overflow_x);
    var overflow_y = find_overflow(image_object.overflow_y);

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
        if (overflow_x) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, overflow_x);
        }
        if (overflow_y) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, overflow_y);
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
please.gl.__build_shader = function (src, uri, lazy) {
    var glsl = {
        "id" : null,
        "type" : null,
        "src" : src,
        "uri" : uri,
        "ready" : false,
        "error" : false,
        "__err_output" : "",
        "lazy" : !!lazy,
        "__on_error" : function () {
            console.error(glsl.__err_output);
            alert("" + this.uri + " failed to build.  See javascript console for details.");
        }
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
            glsl.error = gl.getShaderInfoLog(glsl.id);
            glsl.__err_output = "----- semicompiled shader ----------------\n" +
                debug.join("\n") +
                "Shader compilation error for: " + uri + " \n" +
                glsl.error;
            if (!glsl.lazy) {
                glsl.__on_error();
            }
        }
        else {
            console.info("Shader compiled: " + uri);
            glsl.ready = true;
        }
    }
    else {
        glsl.error = "unknown type for: " + uri;
        throw new Error("Cannot create shader - unknown type for: " + uri);
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
        throw new Error("No webgl context found.  Did you call please.gl.set_context?");
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
        "binding_ctx" : {}, // lists of uniforms associated with contexts
        "instanceable" : {}, // all of the uniforms that support instancing
        "__ptrs" : {}, // cache of named WebGLUniformLocation objects
        "__cache" : {
            // the cache records the last value set,
            "vars" : {},
            "samplers" : {},
        },
        "vert" : null,
        "frag" : null,
        "ready" : false,
        "error" : false,
        "cache_clear" : function () {
            ITER_PROPS(name, this.__cache.vars) {
                this.__cache.vars[name] = null;
            }
            ITER_PROPS(name, this.__cache.samplers) {
                this.__cache.samplers[name] = null;
            }
        },
        "activate" : function () {
            var old = please.gl.__cache.current;
            var prog = this;
            if (old === prog) {
                return;
            }
            if (prog.ready && !prog.error) {
                if (please.gl.__cache.current !== this) {
                    // change shader program
                    gl.useProgram(prog.id);
                    // update the cache pointer
                    please.gl.__cache.current = this;
                    // drop the uniform cache
                    prog.__cache.samplers = {};
                    prog.__cache.vars = {};
                }
            }
            else {
                throw new Error(build_fail);
            }
            ITER_PROPS(prop, please.gl.__globals) {
                prog.vars[prop] = please.gl.__globals[prop];
            }
            if (old) {
                // trigger things to be rebound if neccesary
                var shader_event = new CustomEvent("mgrl_changed_shader");
                shader_event.old_program = old;
                shader_event.new_program = prog;
                window.dispatchEvent(shader_event);
            }
        },
    };

    // create empty context lists
    ITER(c, please.gl.__binding_contexts) {
        var ctx = please.gl.__binding_contexts[c];
        prog.binding_ctx[ctx] = [];
    }

    // sort through the shaders passed to this function
    var errors = [];
    var ast_ref = prog.final_ast = {
        "vert" : null,
        "frag" : null,
    };
    var sources = {
        "vert" : [],
        "frag" : [],
    };
    for (var i=1; i< arguments.length; i+=1) {
        var shader = arguments[i];
        if (typeof(shader) === "string") {
            shader = please.access(shader);
        }
        if (shader) {
            if (sources[shader.mode] !== undefined) {
                sources[shader.mode].push(shader);
            }
            else {
                throw new Error("Only .vert and .frag shaders may be used here.");
            }
        }
    }
    ["vert", "frag"].map(function (type) {
        var shader, count = sources[type].length;
        if (count == 0) {
            throw new Error(
                "You must provide at least one vertex and fragment shader.");
        }
        else if (count == 1) {
            shader = sources[type][0];
        }
        else if (count > 1) {
            var new_src = "";
            var new_uri = [];
            sources[type].map(function (shader) {
                new_src += shader.src;
                new_uri.push(shader.uri);
            });
            shader = new please.gl.ShaderSource(new_src, new_uri.join("::"));
        }
        var blob = shader.__direct_build();
        ast_ref[type] = shader.__ast;
        prog[type] = blob;
        if (blob.error) {
            errors.push(blob.error);
            build_fail += "\n\n" + blob.error;
        }
    });
    if (!prog.vert) {
        throw new Error("No vertex shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your vertex shader?");
    }
    else if (prog.vert.lazy && prog.vert.error) {
        prog.vert.__on_error();
    }
    
    if (!prog.frag) {
        throw new Error("No fragment shader defined for shader program \"" + name + "\".\n" +
              "Did you remember to call please.load on your fragment shader?");
    }
    else if (prog.frag.lazy && prog.frag.error) {
        prog.frag.__on_error();
    }

    if (errors.length > 0) {
        prog.error = errors;
        throw new Error(build_fail);
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

    // track special behavior from glsl->glsl compiler
    var rewrites = {};
    var enums = {};
    ITER_PROPS(shader_type, ast_ref) {
        var tree = ast_ref[shader_type];
        ITER_PROPS(name, tree.rewrite) {
            if (!rewrites[name]) {
                rewrites[name] = tree.rewrite[name];
            }
        }
        ITER_PROPS(name, tree.enums) {
            if (!enums[name]) {
                enums[name] = tree.enums[name];
            }
        }
    }
    ITER(g, ast_ref.vert.globals) {
        var global = ast_ref.vert.globals[g];
        if (global.mode == "in/uniform") {
            ITER(v, global.virtual_globals) {
                var virtual = global.virtual_globals[v];
                if (virtual.rewrite) {
                    rewrites[virtual.name] = virtual.rewrite;
                }
            }
            prog.instanceable[global.name] = global.type;
        }
    }
    console.info("rewrites:");
    console.info(rewrites);
    console.info("enums:");
    console.info(enums);

    var size_lookup = {};
    size_lookup[gl.FLOAT_VEC2] = 2;
    size_lookup[gl.FLOAT_VEC3] = 3;
    size_lookup[gl.FLOAT_VEC4] = 4;
    size_lookup[gl.FLOAT_MAT2] = 4;
    size_lookup[gl.FLOAT_MAT3] = 9;
    size_lookup[gl.FLOAT_MAT4] = 16;
    
    var type_reference = {};
    var __texture_units = 0;
    var request_texture_units = function (count) {
        if (__texture_units + count > please.gl.info.MAX_TEXTURE_IMAGE_UNITS) {
            throw new Error("Exceeded number of available texture units.");
        }
        var first = __texture_units;
        __texture_units += count;
        return first;
    }
        
    // create helper functions for uniform vars
    var bind_uniform = function (data, binding_name) {
        // data.name -> variable name
        // data.type -> built in gl type enum
        // data.size -> array size

        // binding_name is usually data.name, but differs for arrays
        // and also in the event that the uniform is being aliased.
        // data.name is the 'raw' name specified in the shader.

        // vectors and matricies are expressed in their type
        // vars with a size >1 are arrays.

        var pointer = gl.getUniformLocation(prog.id, data.name);
        var uni = "uniform" + u_map[data.type];
        var non_sampler = data.type !== gl.SAMPLER_2D;
        var is_array = data.size > 1;
        var binding_name = rewrites[data.name] || binding_name;
        var strings = enums[binding_name] || null;

        // cache the pointer
        prog.__ptrs[binding_name] = pointer;

        // size of array to be uploaded.  eg vec3 == 3, mat4 == 16
        var vec_size = (size_lookup[data.type] || 1) * data.size;
        type_reference[binding_name] = {
            "size" : vec_size,
            "hint" : data.type,
        };

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
                        prog.__cache.vars[binding_name] = number;
                        return gl[uni](pointer, upload);
                    }
                }
                else if (data.type === gl.INT || data.type === gl.BOOL) {
                    if (strings == null || data.type === gl.BOOL) {
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
                            prog.__cache.vars[binding_name] = number;
                            return gl[uni](pointer, upload);
                        }
                    }
                    else {
                        // Setter for enums
                        setter_method = function (value) {
                            var found;
                            if (value === null) {
                                found = 0;
                            }
                            else if (value.constructor == String) {
                                found = strings.indexOf(value);
                                if (found === -1) {
                                    found = 0;
                                    console.warn("Invalid enum: " + value);
                                }
                            }
                            else if (value.constructor == Number) {
                                found = value;
                            }
                            else {
                                throw new TypeError("Invalid enum: " + value);
                            }
                            prog.__cache.vars[binding_name] = found;
                            var upload = new Int32Array([found]);
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
                    // Setter method for vectors and arbitrary arrays.
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
                    prog.__cache.vars[binding_name] = value;
                    return gl[uni](pointer, new Int32Array([value]));
                };
            }
            else {
                // This is the setter binding for sampler[] type uniforms variables.
                setter_method = function (value) {
                    prog.__cache.vars[binding_name] = value;
                    return gl[uni](pointer, value);
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
            prog.__cache.samplers[binding_name] = null;
            prog.sampler_list.push(binding_name);
            sampler_uniforms.push(binding_name);
            var sampler_setter;
            if (!is_array) {
                data.t_unit = request_texture_units(1);
                data.t_symbol = gl["TEXTURE"+data.t_unit];
                sampler_setter = function (uri) {
                    if (uri === null) {
                        gl.activeTexture(data.t_symbol);
                        gl.bindTexture(gl.TEXTURE_2D, null);
                        prog.__cache.samplers[binding_name] = null;
                        return;
                    }
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
            }
            else {
                data.t_unit = request_texture_units(data.size);
                var null_state = [];
                RANGE(i, data.size) {
                    null_state.push(null);
                }
                Object.freeze(null_state);
                prog.__cache.samplers[binding_name] = null_state;
                sampler_setter = function (uris) {
                    if (uris === null) {
                        RANGE(i, data.size) {
                            var symbol = gl["TEXTURE" + (data.t_unit + i)];
                            gl.activeTexture(symbol);
                            gl.bindTexture(gl.TEXTURE_2D, null);
                        }
                        prog.__cache.samplers[binding_name] = null_set;
                        return;
                    }
                    var upload = [];
                    RANGE(i, data.size) {
                        var uri = uris[i] || null;
                        var unit = data.t_unit + i;
                        var symbol = gl["TEXTURE"+unit];
                        gl.activeTexture(symbol);
                        if (uri === null) {
                            gl.bindTexture(gl.TEXTURE_2D, null);
                            upload.push(null);
                        }
                        else {
                            var t_id = please.gl.get_texture(uri);
                            gl.bindTexture(gl.TEXTURE_2D, t_id);
                            upload.push(unit);
                        }
                    }
                    prog.vars[binding_name] = upload;
                    prog.__cache.samplers[binding_name] = uris;
                }
            }
#if DEBUG
            var ____check_framebuffer_collision = function (uri) {
                if (uri) {
                    uri = uri.__framebuffer_uri || uri;
                    if (uri.constructor === String) {
                        var framebuffer = please.gl.__debug.framebuffer;
                        if (framebuffer && uri.startsWith(framebuffer[0])) {
                            throw new Error("Attempted to bind active frame buffer texture to a uniform.");
                        }
                    }
                }
            };
#endif
            
            if (please.gl.__debug.active) {
                prog.samplers.__defineSetter__(binding_name, function (uri) {
                    please.gl.__debug.texture_units[data.t_unit] = [
                        prog.name, binding_name, uri];
#if DEBUG
                    if (is_array) {
                        RANGE(i, data.size) {
                            ____check_framebuffer_collision(uri[i]);
                        }
                    }
                    else {
                        ____check_framebuffer_collision(uri);
                    }
#endif
                    return sampler_setter(uri);
                });
            }
            else {
                prog.samplers.__defineSetter__(binding_name, sampler_setter);
            }

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
        prog.binding_info[binding_name] = uniform_data;
    }

    // Returns a JSIR token for the GL call needed to
    // update a given uniform.
    prog.__lookup_ir = function (uniform_name, data) {
        if (data === null) {
            throw new Error("prog.__lookup_ir does not accept null value args");
        }
        var type = type_reference[uniform_name].hint;
        var size = type_reference[uniform_name].size;
        var uni = "uniform" + u_map[type];
        var is_sampler = type === gl.SAMPLER_2D;
        var is_array = size > 1;
        var is_dynamic = typeof(data) == "function";
        var is_matrix = uni.indexOf("Matrix") > -1;
        var token = null;
        if (!is_dynamic && !is_sampler) {
            var non_ptr_method = uni.slice(0,-1);
            var flat_args = !!gl[non_ptr_method];
            var method = "gl." + (flat_args? non_ptr_method : uni);
            var pointer = "prog.__ptrs['"+uniform_name+"']";
            var args_array = [pointer];
            if (is_matrix) {
                args_array.push(false); // no need to transpose.
            }
            if (flat_args && data.length) {
                ITER(d, data) {
                    args_array.push(data[d]);
                }
            }
            else {
                if (is_matrix) {
                    var handle = "mat4"; // wrong
                    var src = "[" + data.join(", ") + "]";
                    args_array.push(src);
                }
                else {
                    args_array.push(data);
                }
            }
            token = new please.JSIR(method, args_array);
            if (!is_array) {
                token.flexible_param = args_array.length-1;
            }
        }
        else {
            var target = is_sampler ? "samplers" : "vars";
            var cmd = "this.prog." + target + "['"+uniform_name+"']";
            token = please.JSIR.create_for_setter(cmd, data);
        }
        return token;
    };

    // add a mechanism to lookup uniform type size
    prog.__uniform_initial_value = function (uniform_name) {
        if (prog.sampler_list.indexOf(uniform_name) !== -1) {
            return null;
        }
        var ref = type_reference[uniform_name] || null;
        if (ref) {
            var size = ref.size;
            var hint = ref.hint;
            if (size === null) {
                return null;
            }
            else if (size === 1) {
                return 0;
            }
            else if (hint == gl.FLOAT_MAT2) {
                return mat2.create();
            }
            else if (hint == gl.FLOAT_MAT3) {
                return mat3.create();
            }
            else if (hint == gl.FLOAT_MAT4) {
                return mat4.create();
            }
            else {
                return new Float32Array(size);
            }
        }
        else {
            return null;
        }
    };
    
    // populate binding context lists
    please.prop_map(ast_ref, function (shader_type, ast) {
        ITER(c, please.gl.__binding_contexts) {
            var ctx = please.gl.__binding_contexts[c];
            ITER(g, ast.globals) {
                var global = ast.globals[g];
                if (global.binding_ctx[ctx]) {
                    var name = ast.rewrite[global.name] || global.name;
                    prog.binding_ctx[ctx].push(name);
                }
            }

        }
    });

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


// [+] please.gl.blank_texture(options)
//
// Create a new render texture.  This is mostly intended to be used by
// please.gl.register_framebuffer
//
please.gl.blank_texture = function (opt) {
    var tex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, opt.mag_filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opt.min_filter);

    gl.texImage2D(gl.TEXTURE_2D, 0, opt.format, opt.width, opt.height, 0, 
                  opt.format, opt.type, null);
    return tex;
};


// [+] please.gl.register_framebuffer(handle, options)
//
// Create a new framebuffer with a render texture attached.
//
please.gl.register_framebuffer = function (handle, _options) {
    if (please.gl.__cache.textures[handle]) {
        throw new Error("Cannot register framebuffer to occupied handel: " + handle);
    }

    // Set the framebuffer options.
    var opt = {
        "width" : 512,
        "height" : 512,
        "mag_filter" : gl.NEAREST,
        "min_filter" : gl.NEAREST,
        "type" : gl.UNSIGNED_BYTE,
        "format" : gl.RGBA,
        "buffers" : null,
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
    var tex;
    if (!opt.buffers) {
        tex = please.gl.blank_texture(opt);
    }
    else {
        tex = [];
        ITER(i, opt.buffers) {
            tex.push(please.gl.blank_texture(opt));
        }
    }
    
    // Create the new renderbuffer
    var render = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, render);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, opt.width, opt.height);

    if (!opt.buffers) {
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    }
    else {
        var extension = please.gl.ext["WEBGL_draw_buffers"] || gl;
        var buffer_config = [];
        ITER(i, opt.buffers) {
            var attach_point = "COLOR_ATTACHMENT" + i;
            var attach = extension[attach_point+"_WEBGL"] || extension[attach_point];
            buffer_config.push(attach);
            if (attach === undefined) {
                throw new Error("Insufficient color buffer attachments.  Requested " + opt.buffers.length +", got " + i + " buffers.");
            }
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER, attach, gl.TEXTURE_2D, tex[i], 0);
        }
        extension.drawBuffersWEBGL(buffer_config);
    }

    gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, render);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    if (!opt.buffers) {
        please.gl.__cache.textures[handle] = tex;
        please.gl.__cache.textures[handle].fbo = fbo;
    }
    else {
        please.gl.__cache.textures[handle] = tex[0];
        please.gl.__cache.textures[handle].fbo = fbo;
        fbo.buffers = {};
        ITER(i, opt.buffers) {
            please.gl.__cache.textures[handle + "::" + opt.buffers[i]] = tex[i];
            fbo.buffers[opt.buffers[i]] = tex[i];
        }
    }

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
#if DEBUG
        this.__debug.framebuffer = null;
#endif
    }
    else {
        {
            // HACK - Unbind all texture units before attaching the
            // framebuffer.  This ensures that there will never be a
            // feedback loop.  In the future, it would be better to
            // double buffer instead.
            RANGE(i, this.info.MAX_TEXTURE_IMAGE_UNITS) {
                var symbol = gl["TEXTURE"+i];
                gl.activeTexture(symbol);
                gl.bindTexture(gl.TEXTURE_2D, null);
                if (this.__debug.active) {
                    this.__debug.texture_units[i] = null;
                }
            }
            var prog = please.gl.__cache.current;
            ITER(b, prog.sampler_list) {
                var binding_name = prog.sampler_list[b];
                prog.__cache.samplers[binding_name] = null;
            }
        }
        
        var tex = please.gl.__cache.textures[handle];
        if (tex && tex.fbo) {
#if DEBUG
            ITER(u, this.__debug.texture_units) {
                var unit = this.__debug.texture_units[u];
                if (unit) {
                    var name = unit[1];
                    var uri = unit[2];
                    if (uri.startsWith(handle)) {
                        throw new Error("Attempting to attach framebuffer to bound texture.");
                    }
                }
            }
#endif
            var width = prog.vars.mgrl_buffer_width = tex.fbo.options.width;
            var height = prog.vars.mgrl_buffer_height = tex.fbo.options.height;
            gl.bindFramebuffer(gl.FRAMEBUFFER, tex.fbo);
            gl.viewport(0, 0, width, height);
#if DEBUG
            this.__debug.framebuffer = [handle, tex];
#endif
        }
        else {
            throw new Error("No framebuffer registered for " + handle);
        }
    }
};


// [+] please.gl.reset_viewport()
//
// Reset the viewport dimensions so that they are synced with the
// rendering target's dimensions.
//
please.gl.reset_viewport = function () {
    var width, height;
    if (please.gl.__last_fbo === null) {
        width = please.gl.canvas.width;
        height = please.gl.canvas.height;
    }
    else {
        var opt = please.gl.__cache.textures[please.gl.__last_fbo].fbo.options;
        width = opt.width;
        height = opt.height;
    }
    gl.viewport(0, 0, width, height);
    please.gl.__globals.mgrl_buffer_width = width;
    please.gl.__globals.mgrl_buffer_height = height;

    var prog = please.gl.__cache.current;
    if (prog) {
        prog.vars.mgrl_buffer_width = width;
        prog.vars.mgrl_buffer_height = height;
    }
}


// [+] please.gl.make_grid (tile_w, tile_h, board_w, board_h, origin)
//
// Create a flat grid of tiles, and return a vertex buffer object for
// it.  This generates vertices, normals, and texture coordinates.
//
please.gl.make_grid = function (tile_w, tile_h, board_w, board_h, origin) {
    if (!origin) {
        origin = [0, 0, 0];
    }
#if DEBUG
    console.assert(origin.length === 3, "Origin must be in the form [0, 0, 0].");
#endif

    var position = new Float32Array(18 * board_w * board_h);
    var normal = new Float32Array(18 * board_w * board_h);
    var tcoords = new Float32Array(12 * board_w * board_h);

    var reference = [
        0, 0,
        1, 0,
        1, 1,
        1, 1,
        0, 1,
        0, 0,
    ];

    var offset_x = origin[0] - (tile_w * board_w * 0.5);
    var offset_y = origin[1] - (tile_h * board_h * 0.5);
    var offset_z = origin[2];
    var tile = new Float32Array(4);

    RANGE(tile_y, board_h) {
        RANGE(tile_x, board_h) {
            var pointer = (tile_y * board_h) + tile_x;
            tile[0] = offset_x + (tile_w * tile_x);
            tile[1] = offset_x + (tile_w * (tile_x+1));
            tile[2] = offset_y + (tile_h * tile_y);
            tile[3] = offset_y + (tile_h * (tile_y+1));
            RANGE(row, 6) {
                var ref_x = reference[row*2];
                var ref_y = reference[row*2+1];
                var p_pointer = pointer*18 + (row*3);
                var t_pointer = pointer*12 + (row*2);
                position[p_pointer + 0] = tile[ref_x];
                position[p_pointer + 1] = tile[ref_y+2];
                position[p_pointer + 2] = offset_z;
                normal[p_pointer + 0] = 0;
                normal[p_pointer + 1] = 0;
                normal[p_pointer + 2] = 1;
                tcoords[t_pointer + 0] = (tile_x + ref_x) / board_w;
                tcoords[t_pointer + 1] = (tile_y + ref_y) / board_h;
            }
        }
    };

    var attr_map = {
        "position" : position,
        "normal" : normal,
        "tcoords" : tcoords,
    };
    
    return please.gl.vbo(position.length/3, attr_map);
};


// [+] please.gl.make_quad (width, height, origin)
//
// Create and return a vertex buffer object containing a square.  This
// generates the position, normal, and tcoords attribute buffers.
//
please.gl.make_quad = function (width, height, origin) {
    return please.gl.make_grid(width, height, 1, 1, origin);
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


/* [+] please.gl.ShaderSource(src, uri)
 * 
 * Constructor function for objects representing GLSL source files.
 * 
 */
please.gl.ShaderSource = function (src, uri) {
    this.src = src;
    this.uri = uri;
    this.mode = uri.split(".").slice(-1);
    console.assert(
        this.mode == "vert" || this.mode == "frag" || this.mode == "glsl");
    // parse the AST to catch errors in the source page, as well as to
    // determine if any additional files need to be included.
    this.__ast = please.gl.glsl_to_ast(src, uri);
    this.__blob = null;
    Object.freeze(this.src);
    Object.freeze(this.uri);
    Object.freeze(this.mode);

    // trigger please.load for any source files that might have been
    // included
    var load_opts = {"force_type" : "glsl"};
    ITER(i, this.__ast.inclusions) {
        please.load(this.__ast.inclusions[i], load_opts);
    }
};
please.gl.ShaderSource.prototype.__direct_build = function () {
    if (!this.__blob) {
        var source = "" +
            "#ifdef GL_FRAGMENT_PRECISION_HIGH\n" +
            "precision highp float;\n" +
            "#else\n" +
            "precision mediump float;\n" +
            "#endif\n\n\n" +
            this.__ast.print();
        this.__blob = please.gl.__build_shader(source, this.uri);
    }
    return this.__blob;
};
please.gl.ShaderSource.prototype.ast_copy = function () {
    // The result of this is not cached, as the tree is mutable and
    // many uses for this will need to modify it.  Also, some AST
    // objects make use of getters to do automatic data binding, so a
    // JSON deep copy is not possible here.  Unfortunately that means
    // that calling this is an expensive operation.
    return please.gl.glsl_to_ast(this.src, this.uri);
};


// "glsl" media type handler
please.media.search_paths.glsl = "",
please.media.handlers.glsl = function (url, asset_name, callback) {
    var media_callback = function (req) {
        please.media.assets[asset_name] = new please.gl.ShaderSource(req.responseText, url);
    };
    please.media.__xhr_helper("text", url, asset_name, media_callback, callback);
};
