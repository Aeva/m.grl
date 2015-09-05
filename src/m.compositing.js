// - m.compositing.js ------------------------------------------------------- //

/* [+]
 *
 * The compositing graph is a system for automating and simplifying
 * multipass rendering.  A compositing node is an object that sates
 * which shader program should be used durring, what texture variables
 * it may set, and defines a function which contains the drawing code.
 *
 * The texture properties of a compositing node may be either a URI
 * string denoting an image file, or it can be another compositing
 * node instance.  In the later case, a texture will be generated
 * automatically by rendering the child node to a texture before
 * rendering the parent.
 *
 * The compositing graph is able to solve the correct order in which
 * nodes should be drawn, and so drawing a scene is a singular
 * function call:
 *
 * ```
 * please.render(some_compositing_node);
 * ```
 *
 */


// [+] please.RenderNode(shader_program)
//
// This constructor function creates a compositing node.  The
// 'shader_program' argument is either the name of a compiled shader
// program or a shader program object.  RenderNodes have the following
// properties and methods:
//
//  - **shader** the shader object contains animatable bindings for
//    all uniform variables defined by the provided shader.  Sampler
//    variables may be set as a URI string or another RenderNode
//    object.
//
//  - **graph** if this property is set to a graph node, the default
//    render method will automatically draw this graph node.
//
//  - **peek** may be null or a function that returns a graph node.
//    This may be used to say that another render node should be
//    rendered instead of this one.
//
//  - **render** by default is a function that will call
//    please.gl.splat if the graph property is null or will otherwise
//    call graph.draw().  This function may be overridden to support
//    custom drawing logic.
//
please.RenderNode = function (prog, options) {
    console.assert(this !== window);
    prog = typeof(prog) === "string" ? please.gl.get_program(prog) : prog;

    // UUID, used to provide a uri handle for indirect rendering.
    Object.defineProperty(this, "__id", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : please.uuid(),
    });

    // shader program
    this.__prog = prog;
    Object.defineProperty(this, "__prog", {
        enumerable : false,
        configurable: false,
        writable : false,
        value : prog,
    });

    // optional streaming callback
    this.stream_callback = null;
    if (options && options.stream_callback) {
        if (typeof(options.stream_callback) === "function") {
            this.stream_callback = options.stream_callback;
        }
        else {
            console.warn("RenderNode stream_callback option was not a function!");
            delete options.stream_callback;
        }
    }

    // render buffer
    DEFAULT(options, {});
    please.gl.register_framebuffer(this.__id, options);

    // render targets
    if (options.buffers) {
        this.buffers = {};
        ITER(i, options.buffers) {
            var name = options.buffers[i];
            var proxy = Object.create(this);
            proxy.selected_texture = name;
            this.buffers[name] = proxy;
        }
    }
    else {
        this.buffers = null;
    }

    // glsl variable bindings
    this.shader = {};

    // type introspection table
    var defaults = {};
    defaults[gl.BOOL] = false;

    // add bindings
    for (var name, type, value, i=0; i<prog.uniform_list.length; i+=1) {
        name = prog.uniform_list[i];
        // skip variables that start with mgrl_ as those values are
        // set elsewhere automatically.
        if (!name.startsWith("mgrl_")) {
            type = prog.binding_info[name].type;
            value = defaults.hasOwnProperty(type) ? defaults[type] : null;
            please.make_animatable(this, name, value, this.shader);
        }
    }

    // clear color for this pass
    please.make_animatable_tripple(this, "clear_color", "rgba", [1, 1, 1, 1]);

    // caching stuff
    this.__last_framestart = null;
    this.__cached = null;

    // optional mechanism for specifying that a graph should be
    // rendered, without giving a custom render function.
    this.graph = null;

    prog.cache_clear();
};
please.RenderNode.prototype = {
    "peek" : null,
    "render" : function () {
        if (this.graph !== null) {
            this.graph.draw();
        }
        else {
            please.gl.splat();
        }
    },
};


// [+] please.render(node)
//
// Renders the compositing tree.
//
please.render = function(node) {
    var expire = arguments[1] || window.performance.now();
    var stack = arguments[2] || [];
    if (stack.indexOf(node)>=0) {
        throw("M.GRL doesn't currently suport render graph cycles.");
    }

    if (stack.length > 0 && node.__last_framestart >= expire && node.__cached) {
        return node.__cached;
    }
    else {
        node.__last_framestart = please.pipeline.__framestart;
    }

    // peek method on the render node can be used to allow the node to exclude
    // itself from the stack in favor of a different node or texture.
    if (node.peek) {
        var proxy = node.peek();
        if (proxy) {
            if (typeof(proxy) === "string") {
                // proxy is a URI
                if (stack.length > 0) {
                    return proxy;
                }
                else {
                    // FIXME: splat render the texture and call it a day
                    throw("missing functionality");
                }
            }
            else if (typeof(proxy) === "object") {
                // proxy is another RenderNode
                return please.render(proxy, expire, stack);
            }
        }
    }

    // add this node to the stack
    stack.push(node);

    // call rendernodes for samplers, where applicable, and then cache output
    var samplers = node.__prog.sampler_list;
    var sampler_cache = {};
    for (var i=0; i<samplers.length; i+=1) {
        var name = samplers[i];
        var sampler = node.shader[name];
        if (sampler !== null) {
            if (typeof(sampler) === "object") {
                sampler_cache[name] = please.render(sampler, expire, stack);
            }
            else {
                sampler_cache[name] = sampler;
            }
        }
    }

    // call the before_render method, if applicable
    if (node.before_render) {
        node.before_render();
    }

    // remove this node from the stack
    stack.pop();

    // activate the shader program
    node.__prog.activate();

    // upload shader vars
    for (var name in node.shader) {
        if (node.__prog.vars.hasOwnProperty(name)) {
            var value = sampler_cache[name] || node.shader[name];
            if (value !== null && value !== undefined) {
                if (node.__prog.samplers.hasOwnProperty(name)) {
                    node.__prog.samplers[name] = value;
                }
                else {
                    node.__prog.vars[name] = value;
                }
            }
        }
    }

    // use an indirect texture if the stack length is greater than 1
    node.__cached = stack.length > 0 ? node.__id : null;
    please.gl.set_framebuffer(node.__cached);

    // call the rendering logic
    gl.clearColor.apply(gl, node.clear_color);
    node.__prog.vars.mgrl_clear_color = node.clear_color;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    node.render();

    // optionally pull the texture data into an array and trigger a
    // callback
    if (node.stream_callback && node.__cached) {
        var fbo = please.gl.__cache.textures[node.__cached].fbo;
        var width = fbo.options.width;
        var height = fbo.options.height;
        var format = fbo.options.format;
        var type = fbo.options.type;
                
        var ArrayType = null;
        if (type === gl.UNSIGNED_BYTE) {
            ArrayType = Uint8Array;
        }
        else if (type === gl.FLOAT) {
            ArrayType = Float32Array;
        }
        else {
            console.warn("Cannot read pixels from buffer of unknown type!");
        }

        var period = null;
        if (format === gl.RGBA) {
            period = 4;
        }
        else {
            console.warn("Cannot read pixels from non-rgba buffers!");
        }

        if (type && period) {
            var pixels = new ArrayType(width*height*period);
            var info = {
                "width" : width,
                "height" : height,
                "format" : format,
                "type" : type,
                "period" : period,
            };
            gl.readPixels(0, 0, width, height, format, type, pixels);
            node.stream_callback(pixels, info);
        }
    }

    // clean up
    if (stack.length === 0) {
        gl.clearColor.apply(gl, please.__clear_color);
    }

    // return the uuid of the render node if we're doing indirect rendering
    if (node.__cached && node.selected_texture) {
        return node.__id + "::" + node.selected_texture;
    }
    else {
        return node.__cached;
    }
};


// [+] please.indirect_render(node)
//
// Renders the compositing tree, always into indirect buffers.
// Nothing is drawn on screen by this function.
//
please.indirect_render = function(node) {
    return please.render(node, null, [null]);
};


// [+] please.TransitionEffect(shader_program)
//
// TransitionEffect nodes are RenderNodes with some different
// defaults.  They are used to blend between two different
// RenderNodes.
//
// TransitionEffects differ from RenderNodes in the following ways:
//
//  - assumes the shader defines a float uniform named "progress"
//
//  - assumes the shader defines a sampler uniform named "texture_a"
//
//  - assumes the shader defines a sampler uniform named "texture_b"
//
//  - the render method always calls please.gl.splat()
//
//  - the peek method is defined so as to return one of the textures
//    if shader.progress is either 0.0 or 1.0.
//
// TransitionEffect nodes also define the following:
//
//  - **reset_to(texture)** sets shader.texture_a to texture and
//    shader.progress to 0.0.
//
//  - **blend_to(texture, time)** sets shader.texture_b to texture,
//    and shader.progress to a driver that blends from 0.0 to 1.0
//    over the provide number of miliseconds.
//
//  - **blend_between(texture_a, texture_b, time)** shorthand method
//    for the above two functions.
//
please.TransitionEffect = function (prog) {
    please.RenderNode.call(this, prog);
    this.shader.progress = 0.0;
};
please.TransitionEffect.prototype = Object.create(please.RenderNode.prototype);
please.TransitionEffect.prototype.peek = function () {
    if (this.shader.progress === 0.0) {
        return this.shader.texture_a;
    }
    else if (this.shader.progress === 1.0) {
        return this.shader.texture_b;
    }
    else {
        return null;
    }
};
please.TransitionEffect.prototype.render = function () {
    please.gl.splat();
};
please.TransitionEffect.prototype.reset_to = function (texture) {
    this.shader.texture_a = texture;
    this.shader.progress = 0.0;
};
please.TransitionEffect.prototype.blend_to = function (texture, time) {
    this.shader.texture_b = texture;
    this.shader.progress = please.shift_driver(0.0, 1.0, time);
};
please.TransitionEffect.prototype.blend_between = function (texture_a, texture_b, time) {
    this.reset_to(texture_a);
    this.blend_to(texture_b, time);
};
