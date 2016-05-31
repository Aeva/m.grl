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
    this.dirty = true;

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
            if (typeof(param.value) == "function") {
                cache[param.id] = param.value();
            }
            else {
                cache[param.id] = param.value;
            }
            lookup = 'this["' + param.id + '"]';
        }
        else if (param.value === null) {
            lookup = "null";
        }
        else {
            lookup = param.value.toString();
        }
        args.push(lookup);
    }
    this.dirty = false;
    return please.format_invocation.apply(please, args);
};


please.JSIR.prototype.update_arg = function (index, value, cache) {
    var param = this.params[index];
    if (!param.dynamic) {
        this.dirty = true;
    }
    param.value = value;
    param.dynamic = true;
    if (cache) {
        if (value.constructor === Function) {
            cache[param.id] = value();
        }
        else {
            cache[param.id] = value;
        }
    }
};


// [+] please.__drawable_ir(prog, vbo, ibo, start, total, defaults, graph_node)
// 
// Creates a list of IR objects needed to render a partical VBO/IBO of
// data.  The only required params are 'prog' and 'vbo'.
//
//  - **prog** a compiled shader program object
//  - **vbo** a vbo object, as defined in m.gl.buffers.js
//  - **ibo** an ibo object, as defined in m.gl.buffers.js
//  - **start** starting vertex to draw, defaults to 0
//  - **total** number of vertices to draw, defaults to maximum
//  - **defaults** a key-value store for the default uniform values
//  - **graph_node** a graph node object to optionally data bind against
//
// This method returns a list of strings and IR objects that can be
// used to generate a function.
//
please.__drawable_ir = function (prog, vbo, ibo, start, total, defaults, graph_node) {
    var ir = [];
    var is_static = !graph_node;
    // add IR for VBO bind
    
    // add IR for IBO bind, if applicable
    
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
    }
    ITER(u, uniforms) {
        // generate the IR for uniforms and if applicable, set up the
        // appropriate bindings to the supplied GraphNode
        var name = uniforms[u];
        var value = uniform_defaults[name];
        var cmd = "this.prog.vars['"+name+"']";
        if (is_static) {
            var token = new please.JSIR('=', cmd, value);
        }
        else {
            var token = new please.JSIR('=', cmd, '@', value);
        }
        ir.push(token);
    }

    // add IR for appropriate draw call
    if (ibo) {
        ir.push(ibo.static_draw(start, total));
    }
    else {
        ir.push(vbo.static_draw(start, total));
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
