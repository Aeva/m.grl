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
    this.__is_render_node = true;

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
        configurable: true,
        writable : false,
        value : prog,
    });

    // optional render frequency
    this.frequency = null;
    if (options && options.frequency) {
        this.frequency = options.frequency;
    }

    // optional streaming callback
    this.__stream_cache = null;
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
            var binding = prog.binding_info[name];
            if (binding) {
                type = prog.binding_info[name].type;
                value = defaults.hasOwnProperty(type) ? defaults[type] : null;
            }
            else {
                value = null;
            }
            please.make_animatable(this, name, value, this.shader);
        }
    }

    // clear color for this pass
    please.make_animatable_tripple(this, "clear_color", "rgba", [1, 1, 1, 1]);

    // Book keeping for tracking how many times this is node is
    // rendered in a frame, to allow results to be cached.
    this.__last_framestart = null;
    this.__cached_framebuffer = null;

    // The "graph" property is an optional mechanism for which a scene
    // graph may be associated with a compositing node.  A custom
    // rendering function will be generated for the graph to make
    // rendering as efficient as possible.
    this.__static_draw_cache = {
        "prog" : prog,
        "graph" : null,
    };
    this.__dirty_draw = false;
    this.__graph = null;
    var recompile_me = this.__recompile_draw.bind(this);
    Object.defineProperty(this, "graph", {
        "get" : function () {
            return this.__graph;
        }.bind(this),
        "set" : function (new_graph) {
            var old_graph = this.__graph;
            if (old_graph !== new_graph) {
                if (old_graph) {
                    old_graph.__regen_static_draw.disconnect(recompile_me);
                }
                if (new_graph) {
                    new_graph.__regen_static_draw.connect(recompile_me);
                }
                this.__graph = !!new_graph ? new_graph : null;
                this.__static_draw_cache.graph = new_graph;
                this.__recompile_draw();
            }
            else {
                return new_graph;
            }
        }.bind(this),
    });

    prog.cache_clear();
    this.__recompile_draw();
};
please.RenderNode.prototype = {
    "peek" : null,
    "render" : function () {},
};
please.RenderNode.prototype.__splat_draw = function () {
    // Render this node as a full screen quad.
    please.gl.splat();
};
please.RenderNode.prototype.__recompile_draw = function () {
    // Mark the static draw function as being dirty, schedule a
    // 'recompile_draw' call.  Using set timeout to run the call
    // after the current callstack returns, so as to prevent
    // some redundant recompiles.

    if (!this.__graph) {
        this.render = this.__splat_draw;
    }
    else if (!this.__dirty_draw) {
        this.__dirty_draw = true;
        window.setTimeout(function () {
            this.__compile_graph_draw();
        }.bind(this), 0);
    }
};
please.RenderNode.prototype.__compile_graph_draw = function () {
    // (Re)compiles the draw function for this RenderNode, so as to
    // most efficiently render the information described in the
    // assigned graph root.
    
    var graph = this.__graph;
    var ir = [];

    // Generate render function prefix IR.
    ir.push(
// ☿ quote
        var camera = this.graph.camera || null;
        var graph = this.graph;
        var prog = this.prog;
        if (graph.__last_framestart < please.time.__framestart) {
            // note, this.__last_framestart can be null, but
            // null<positive_number will evaluate to true anyway.
            graph.tick();
        }
        if (camera) {
            graph.camera.update_camera();
            prog.vars.projection_matrix = camera.projection_matrix;
            prog.vars.view_matrix = camera.view_matrix;
            prog.vars.focal_distance = camera.focal_distance;
            prog.vars.depth_of_field = camera.depth_of_field;
            prog.vars.depth_falloff = camera.depth_falloff;
            if (camera.__projection_mode === "orthographic") {
                prog.vars.mgrl_orthographic_scale = 32/camera.orthographic_grid;
            }
            else {
                prog.vars.mgrl_orthographic_scale = 1.0;
            }
        }
        else {
            throw new Error("The scene graph has no camera in it!");
        }
        
        // BEGIN GENERATED GRAPH RENDERING CODE
// ☿ endquote
    );

    // Generate the IR for rendering the individual graph nodes.
    var state_tracker = {};
    ITER(s, graph.__statics) {
        var node = graph.__statics[s];
        var node_ir = node.__ir.generate(this.__prog, state_tracker) || [];
        ITER(p, node_ir) {
            var token = node_ir[p];
            if (token.constructor == please.JSIR) {
                token.compiled = true;
            }
            ir.push(token);
        }
    }

    // Generate render function suffix IR.
    ir.push(
// ☿ quote
        // END GENERATED GRAPH RENDERING CODE
        
        // Legacy dynamic rendering code follows:
        if (graph.__states) {
            ITER_PROPS(hint, graph.__states) {
                var children = graph.__states[hint];
                ITER(i, children) {
                    var child = children[i];
                    //if (!(exclude_test && exclude_test(child))) {
                        if (child.__static_draw) {
                            child.__static_draw();
                        }
                        else {
                            child.__bind(prog);
                            child.__draw(prog);
                        }
                    //}
                }
            }
        }
        if (graph.__alpha) {
            // sort the transparent items by z
            var screen_matrix = mat4.create();
            mat4.multiply(
                screen_matrix,
                camera.projection_matrix,
                camera.view_matrix);
            ITER(i, graph.__alpha) {
                var child = graph.__alpha[i];
                child.__z_sort_prep(screen_matrix);
            };
            graph.__alpha.sort(graph.__z_sort_function);
            
            // draw translucent elements
            gl.depthMask(false);
            ITER(i, graph.__alpha) {
                var child = graph.__alpha[i];
                //if (!(exclude_test && exclude_test(child))) {
                    child.__bind(prog);
                    child.__draw(prog);
                //}
            }
            gl.depthMask(true);
        }
// ☿ endquote
    );
    
    var src = please.__compile_ir(ir, this.__static_draw_cache);
    this.__render_src = src;
    this.__render_ir = ir;
    this.render = new Function(src).bind(this.__static_draw_cache);
    this.__dirty_draw = false;
    console.info("recompiled a static draw function");
};


// [+] please.set_viewport(render_node)
//
// Designate a particular RenderNode to be the rendering output.  You
// can pass null to disable this mechanism if you want to override
// m.grl's rendering management system, which you probably don't want
// to do.
//
please.__compositing_viewport = null;
please.set_viewport = function (node) {
    var old_node = please.__compositing_viewport;
    if (!!node && node.__is_render_node) {
        // special case for loading screens
        if (old_node && old_node.raise_curtains && !old_node.__curtains_up) {
            old_node.raise_curtains(node);
        }
        else {
            please.__compositing_viewport = node;
        }
    }
    else {
        please.__compositing_viewport = null;
    }
};


// [+] please.render(node)
//
// Renders the compositing tree.
//
please.render = function(node) {
    var expire = arguments[1] || please.time.__framestart;
    var stack = arguments[2] || [];
    if (stack.indexOf(node)>=0) {
        throw new Error("M.GRL doesn't currently suport render graph cycles.");
    }

    var delay = 0;
    if (node.frequency) {
        delay = (1/node.frequency)*1000;
    }

    if (stack.length > 0 && (node.__last_framestart+delay) >= expire && node.__cached_framebuffer) {
        return node.__cached_framebuffer;
    }
    else {
        node.__last_framestart = please.time.__framestart;
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
                    throw new Error("missing functionality");
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

    // use an indirect texture if the stack length is greater than 1
    node.__cached_framebuffer = stack.length > 0 ? node.__id : null;

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
    ITER(i, node.__prog.sampler_list) {
        var name = node.__prog.sampler_list[i];
        if (node.__prog.samplers[name] === node.__cached_framebuffer) {
            node.__prog.samplers[name] = "error_image";
        }
    }

    // call the rendering logic
    please.gl.set_framebuffer(node.__cached_framebuffer);
    gl.clearColor.apply(gl, node.clear_color);
    node.__prog.vars.mgrl_clear_color = node.clear_color;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    node.render();

    // optionally pull the texture data into an array and trigger a
    // callback
    if (node.stream_callback && node.__cached_framebuffer) {
        var fbo = please.gl.__cache.textures[node.__cached_framebuffer].fbo;
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
            if (!node.__stream_cache) {
                node.__stream_cache = new ArrayType(width*height*period);
            }
            var info = {
                "width" : width,
                "height" : height,
                "format" : format,
                "type" : type,
                "period" : period,
            };
            gl.finish();
            gl.readPixels(0, 0, width, height, format, type, node.__stream_cache);
            node.stream_callback(node.__stream_cache, info);
        }
    }

    // clean up
    if (stack.length === 0) {
        gl.clearColor.apply(gl, please.__clear_color);
    }

    // return the uuid of the render node if we're doing indirect rendering
    if (node.__cached_framebuffer && node.selected_texture) {
        return node.__id + "::" + node.selected_texture;
    }
    else {
        return node.__cached_framebuffer;
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
