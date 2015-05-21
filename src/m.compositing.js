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
    for (var name, i=0; i<prog.uniform_list.length; i+=1) {
        name = prog.uniform_list[i];
        please.make_animatable(this, name, null, this.shader);
    }

    // caching stuff
    this.__last_framestart = null;
    this.__cached = null;

    // event handlers
    this.peek = null;
    this.render = function () { return null; };
};


//
please.render = function(node) {
    var stack = arguments[1] || [];
    if (stack.indexOf(node)>=0) {
        throw("M.GRL doesn't currently suport render graph cycles.");
    }

    if (stack.length > 0 && node.__last_framestart >= please.pipeline.__framestart && node.__cached) {        
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
                return please.render(proxy, stack);
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
        if (sampler) {
            if (typeof(sampler) === "object") {
                sampler_cache[name] = please.render(sampler, stack);
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
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    node.render();

    // return the uuid of the render node if we're doing indirect rendering
    return node.__cached;
};