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


please.JSIR.prototype.compile = function (cache) {
    var args = [this.method];
    ITER(p, this.params) {
        var lookup, param = this.params[p];
        if (param.dynamic) {
            cache[param.id] = param.value;
            lookup = 'this["' + param.id + '"]';
            if (typeof(param.value) == "function") {
                lookup += "()";
            }
        }
        else if (param.value === null) {
            lookup = "null";
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


// [+] please.__drawable_ir(prog, vbo, ibo, ranges, defaults, graph_node)
// 
// Creates a list of IR objects needed to render a partical VBO/IBO of
// data.  The only required params are 'prog' and 'vbo'.
//
//  - **prog** a compiled shader program object
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
// This method returns a list of strings and IR objects that can be
// used to generate a function.
//
please.__drawable_ir = function (prog, vbo, ibo, ranges, defaults, graph_node) {
    var ir = [];
    // add IR for VBO bind
    ir.push(vbo.static_bind(prog));
    
    // add IR for IBO bind, if applicable
    if (ibo) {
        ir.push(ibo.static_bind);
    }

    // recompile signal
    ir.dirty = new please.Signal();
    
    // add IR for uniforms
    var uniforms = [];
    var uniform_defaults = defaults || {};
    var named_defaults = defaults ? please.get_properties(defaults) : [];
    ITER(u, prog.uniform_list) {
        // determine which uniforms apply to this object
        var name = prog.uniform_list[u];
        if (named_defaults.indexOf(name) > -1) {
            // uniforms in the defaults list are always used if the
            // shader program features them
            uniforms.push(name);
        }
        else if (prog.binding_ctx["GraphNode"].indexOf(name) > -1) {
            // otherwise, only use uniforms that are in the GraphNode
            // binding context.
            uniforms.push(name);
            uniform_defaults[name] = prog.__uniform_initial_value(name);
        }
        else if (graph_node && graph_node.__ani_store[name]) {
            uniforms.push(name);
        }
    }
    var bindings = {};
    // index for inserting new uniform bindings
    var uniforms_offset = ir.length;
    var add_binding = function (name, value) {
        var target = prog.samplers.hasOwnProperty(name) ? "samplers" : "vars";
        var cmd = "this.prog." + target + "['"+name+"']";

        if (graph_node) {
            // setup dynamic bindings
            if (!graph_node.__ani_store[name]) {
                graph_node.__ani_store[name] = value;
            }
            if (!graph_node.__ani_store[name]) {
                value = null;
            }
            else if (typeof(graph_node.__ani_store[name]) == "function") {
                value = graph_node.__ani_debug[name].get;
            }
            else {
                value = graph_node.__ani_store[name];
                if (typeof(value) == "string") {
                    value = '"' + value + '"';
                }
            }
            var token = new please.JSIR('=', cmd, value);
        }
        else {
            // otherwise, just use static bindings
            var token = new please.JSIR('=', cmd, '@', value);
        }
        // Using splice here instead of push so that we can insert
        // before things added after the uniforms.
        ir.splice(uniforms_offset, 0, token);
        uniforms_offset += 1;
        bindings[name] = token;
    }
    
    ITER(u, uniforms) {
        // generate the IR for uniforms and if applicable, set up the
        // appropriate bindings to the supplied GraphNode
        var name = uniforms[u];
        var value = uniform_defaults[name];
        add_binding(name, value);
    }

    if (graph_node) {
        graph_node.__uniform_update.connect(function (target, prop, obj) {
            if (bindings[prop]) {
                bindings[prop].update_arg(1, obj.__ani_debug[prop].get);
                ir.dirty();
            }
            else if (obj.__ani_store[prop] && obj.__ani_debug[prop]) {
                add_binding(prop, obj.__ani_debug[prop].get);
            }
            else if (obj.__ani_store[prop]) {
                add_binding(prop, obj.__ani_store[prop]);
            }
        });
    }

    // add IR for appropriate draw call
    if (!ranges) {
        ranges = [[null, null]];
    }
    var draw_buffer = ibo || vbo;
    ITER(r, ranges) {
        var start = ranges[r][0];
        var total = ranges[r][1];
        ir.push(draw_buffer.static_draw(start, total));
    }
    
    return ir;
};


// [+] please.__compile_ir(ir_tokens, cache)
//
// Takes a list of IR tokens and strings and generates a function from
// them.
//
please.__compile_ir = function (ir_tokens, cache) {
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
    return src;
};
