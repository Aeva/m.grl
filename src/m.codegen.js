// - m.codegen.js ----------------------------------------------------------- //

/* [+]
 *
 * This part of the module defines functionality for code generation,
 * and is intended for internal use only.
 * 
 */


// [+] please.format_invocation(method, arg1, arg2, etc)
// 
// Returns a string containing what is hopefully valid JS source code
// for calling the specified method with hardcoded arguments.
//
// If the method string is equal to "=", then the invocation will be
// formatted as an assignment statement, and exactly two arguments
// will be expected.
//
please.format_invocation = function (method_string/*, args */) {
    var cmd, args = Array.apply(null, arguments).slice(1);
    
    if (method_string == "=") {
        // method is actually an assignment macro
        if (args.length !== 2) {
            throw new Error("Expected exactly two optional arguments.");
        }
        cmd = "" + args[0] + " = " + args[1] + ";";
    }
    else {
        // normal method invocation
        cmd = "" + method_string + "(" + args.join(", ") + ");";
    }
    return cmd;
};


// [+] please.JSIR(method_name, arg1, arg2, etc)
//
// Constructor.  Arguments are similar to 'please.format_invocation' -
// first is the string for the method invocation this wraps, and the
// remaining params represent the arguments to said wrapped method.
//
// Where this differs is, arguments can be functions or just null.
// They can be changed on the fly.
//
// Call the 'compile' method with a cache object to produce the final
// output.
//
// To mark a particular argument as being a non-static value, precede
// it by a '@' like in the example below.
//
// ```
// var ir = new please.JSIR("alert", '@', "hello world!");
// var cache = {};
// var generated = new Function(ir.compile(cache)).bind(cache);
// generated();
// cache[ir.params[0].id] = "haaax"
// generated();
// ```
//
please.JSIR = function (method_string/*, args */) {
    var args = Array.apply(null, arguments).slice(1);
    this.method = method_string;
    this.params = [];
    this.compiled = false;
    this.frozen = false;

    // A typed array with the property "__ir_repr", used to override
    // the compiled output for this object.
    this.lease = false;

    var force_dynamic = false;
    ITER(a, args) {
        if (args[a] === '@') {
            force_dynamic = true;
            continue;
        }
        this.params.push({
            "id" : please.uuid(),
            "value" : args[a],
            "dynamic" : force_dynamic || typeof(args[a]) == "function",
        });
        force_dynamic = false;
    }
};


// Generates a line of javascript from the IR objcet.  The values of
// dynamic variables will be updated into the object provided via the
// 'cache' parameter.
please.JSIR.prototype.compile = function (cache, heap) {
    var args = [this.method];
    ITER(p, this.params) {
        var lookup, param = this.params[p];
        if (p == 1 && this.lease) {
            args.push(this.lease.__ir_repr);
            break;
        }
        else if (param.dynamic) {
            cache[param.id] = param.value;
            lookup = 'this["' + param.id + '"]';
            if (typeof(param.value) == "function") {
                lookup += "()";
            }
        }
        else if (param.value === null) {
            lookup = "null";
        }
        else if (param.value.constructor.name.indexOf("Array") > -1) {
            var builder = "[";
            var first = true;
            ITER(i, param.value) {
                if (!first) {
                    builder += ", ";
                }
                else {
                    first = false;
                }
                builder += param.value[i];
            }
            builder += "]";
            lookup = builder;
        }
        else {
            lookup = param.value.toString();
        }
        args.push(lookup);
    }
    var prefix = '';
    if (this.method == "=" && lookup == "null") {
        // Dummy out the return value if we're setting something to
        // null.  This should be made to be more specific to only
        // dummy out the return value if we're setting something in
        // prog.vars to null.
        prefix = "// ";
    }
    return prefix + please.format_invocation.apply(please, args);
};


// Force the IR to be static and the param values to be cache function
// returns.
please.JSIR.prototype.freeze = function () {
    this.frozen = true;
    Object.freeze(this.frozen);
    ITER(p, this.params) {
        var param = this.params[p];
        param.dynamic = false;
        if (typeof(param.value) == "function") {
            param.value = param.value();
        }
        if (typeof(param.value) == "function") {
            param.value = null;
        }
    };
};


// Updates the value of one of the parameters in the IR object.  If
// the IR object was used in the compilation of a draw function
// already, then this will also force the parameter to become dynamic
// if it was not already.
please.JSIR.prototype.update_arg = function (index, value, cache) {
    var param = this.params[index];
    param.value = value;
    if (this.compiled || typeof(value) == "function") {
        param.dynamic = true;
    }
    if (cache) {
        cache[param.id] = value;
    }
};


// [+] please.__DrawableIR(vbo, ibo, ranges, defaults, graph_node)
//
// Creates an DrawableIR object, which has a "generate" function to
// produce a list of the IR objects needed to render a particular
// VBO/IBO of data.  The only required param is 'vbo'.
//
//  - **vbo** a vbo object, as defined in m.gl.buffers.js
//
//  - **ibo** an ibo object, as defined in m.gl.buffers.js
//
//  - **ranges** is a list of two element lists.  The values represent
//    ranges to be passed into the draw calls.  The first value is the
//    starting vertex or face, the second value is the total number of
//    vertices or faces to draw.  If ommitted, it will default to
//    [[null, null]], which will draw the entire buffer.
//
//  - **defaults** a key-value store for the default uniform values
//
//  - **graph_node** a graph node object to optionally data bind against
//
// Call the 'generate' method with a shader program object as the
// first argument to receive a list of strings and IR objects that can
// be used to generate a function to draw the described object.
//
please.__DrawableIR = function (vbo, ibo, ranges, defaults, graph_node) {
    this.__uniforms = {};
    this.__vbo = vbo;
    this.__ibo = ibo;
    this.__ranges = ranges;
    this.__defaults = defaults || {};
    this.__node = graph_node;
    this.__frozen = false;

    // recompile signal
    this.dirty = new please.Signal();

    // add initial uniform bindings
    this.bindings_for_shader(null);

    // connect to GraphNode's dirty signal
    if (graph_node) {
        graph_node.__uniform_update.connect(function (target, prop, obj) {
            this.bind_or_update_uniform(prop, obj.__ani_store[prop]);
            this.dirty();
        }.bind(this));
    }

    // add IR for appropriate draw call
    if (!ranges) {
        ranges = [[null, null]];
    }

    this.__draw_invocation = "";
    var draw_buffer = ibo || vbo;
    ITER(r, ranges) {
        var start = ranges[r][0];
        var total = ranges[r][1];
        this.__draw_invocation = draw_buffer.static_draw(start, total);
    }
};


please.__DrawableIR.prototype = {};


// mark all uniforms as being static, cache the current driver values
please.__DrawableIR.prototype.freeze = function () {
    if (this.__frozen) {
        return;
    }
    this.__frozen = true;
    Object.freeze(this.__frozen);
    this.dirty();
};


// make a copy of this IR object and freeze it
please.__DrawableIR.prototype.copy_freeze = function () {
    var defaults = {};
    ITER_PROPS(key, this.__node.__ani_cache) {
        this.__node.__ani_cache[key] = null;
    }
    ITER_PROPS(key, this.__defaults) {
        defaults[key] = this.__defaults[key];
        if (this.__node && this.__node.__ani_store[key]) {
            var value = this.__node.__ani_store[key];
            if (typeof(value) == "function") {
                value = value.call(this.__node);
            }
            defaults[key] = please.copy(value);
        }
    }
    
    var copy = new please.__DrawableIR(
        this.__vbo,
        this.__ibo,
        this.__ranges,
        defaults,
        null);

    copy.freeze();
    return copy;
};


please.__DrawableIR.prototype.bindings_for_shader = function (prog, heap) {
    if (!prog) {
        prog = please.gl.__cache.current;
    }
    var named_uniforms = [];
    var named_defaults = please.get_properties(this.__defaults);

    // Populate 'named_uniforms' to see what we need bindings for.
    ITER(u, prog.uniform_list) {
        // determine which uniforms apply to this object
        var name = prog.uniform_list[u];
        if (this.__uniforms[name]) {
            // skip uniforms with existing bindings
            continue;
        }
        else if (named_defaults.indexOf(name) > -1) {
            // uniforms in the defaults list are always used if the
            // shader program features them
            named_uniforms.push(name);
        }
        else if (prog.binding_ctx["GraphNode"].indexOf(name) > -1) {
            // otherwise, only use uniforms that are in the GraphNode
            // binding context.
            named_uniforms.push(name);
            this.__defaults[name] = prog.__uniform_initial_value(name);
        }
        else if (this.__node && this.__node.__ani_store[name]) {
            // or ones that have been assigned explicit values already.
            named_uniforms.push(name);
        }
    }

    // generate the IR for the above divined uniforms
    ITER(u, named_uniforms) {
        var name = named_uniforms[u];
        var value = this.__defaults[name];
        this.bind_or_update_uniform(name, value, heap);
    }
};


please.__DrawableIR.prototype.bind_or_update_uniform = function (name, value, heap) {
    var binding = this.__uniforms[name] ||  null;
    var compiled = binding ? binding.compiled : false;

    if (this.__node) {
        var store = this.__node.__ani_store[name];
        if (!store) {
            this.__node.__ani_store[name] = value;
        }
        else if (typeof(store) == "function" || compiled) {
            value = this.__node.__ani_debug[name].get;
        }
        else {
            value = this.__node.__ani_store[name];
        }
    }

    if (binding) {
        binding.update_arg(1, value);
    }
    else {
        // create a new token for the uniform binding:
        var target = value !== null && value.constructor == String ? "samplers" : "vars";
        var cmd = "this.prog." + target + "['"+name+"']";
        var token;
        if (typeof(value) == "function") {
            token = new please.JSIR('=', cmd, '@', value);
        }
        else {
            if (value.constructor == String) {
                value = '"' + value + '"';
            }
            token = new please.JSIR('=', cmd, value);
        }
        this.__uniforms[name] = token;
    }    
};


please.__DrawableIR.prototype.generate = function (prog, state_tracker, heap) {
    this.bindings_for_shader(prog);
    var ir = [];
    ir.push(this.__vbo.static_bind(prog, state_tracker));
    if (this.__ibo) {
        if (state_tracker["ibo"] !== this.__ibo.id) {
            ir.push(this.__ibo.static_bind);
            state_tracker["ibo"] = this.__ibo.id;
        }
    }

    ITER(u, prog.uniform_list) {
        // determine which uniforms apply to this object
        var name = prog.uniform_list[u];
        var token = this.__uniforms[name];
        if (token) {
            var value = token.params[1];
            var state_key = "uniform:"+name;
            if (this.__frozen && !token.frozen) {
                token.freeze();
            }
            if (value.dynamic) {
                ir.push(token);
                delete state_tracker[state_key];
            }
            else if (state_tracker[state_key] !== value.value) {
                if (!token.lease) {
                    var type = null;
                    var size = value.value.length || null;
                    if (name.endsWith("matrix")) {
                        type = Float32Array;
                    }
                    if (type && size) {
                        token.lease = heap.request(type, size);
                        ITER(r, token.lease) {
                            token.lease[r] = value.value[r];
                        }
                    }
                }
                ir.push(token);
                state_tracker[state_key] = value.value;
            }
        }
    }

    ir.push(this.__draw_invocation);
    return ir;
};


// [+] please.__compile_ir(ir_tokens, cache, [src_name])
//
// Takes a list of IR tokens and strings and generates a function from
// them.  Optionally you can pass a name for this function, which is
// used to add a sourceURL directive to the funtion, so that it can be
// debugged in firefox.  If src_name is omitted, then a UUID will be
// assigned.
//
please.__compile_ir = function (ir_tokens, cache, src_name) {
    var src = "";
    ITER(t, ir_tokens) {
        var token = ir_tokens[t];
        if (token.constructor == String) {
            src += token;
        }
        else if (token.compile) {
            src += token.compile(cache);
        }
        else {
            throw new Error("Invalid IR token.");
        }
        src += "\n";
    }
    if (!src_name) {
        src_name = please.uuid();
    }
    src += "\n\n//# sourceURL=" + src_name + ".js"
    return src;
};
