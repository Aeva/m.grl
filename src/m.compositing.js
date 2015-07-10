// - m.compositing.js ------------------------------------------------------- //


//
please.RenderNode = function (prog) {
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

    // render buffer
    this.__buffer = please.gl.register_framebuffer(this.__id, {});

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

    // clean up
    if (stack.length === 0) {
        gl.clearColor.apply(gl, please.__clear_color);
    }

    // return the uuid of the render node if we're doing indirect rendering
    return node.__cached;
};


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
