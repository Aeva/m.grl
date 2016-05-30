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
please.format_invocation = function (method_string) {
    var args = Array.apply(null, arguments).slice(1);
    var cmd = "" + method_string + "(" + args.join(", ") + ");";
    return cmd;
};


// [+] please.JSIR(force_dynamic, method_name, arg1, arg2, etc)
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
// ```
// var ir = new please.JSIR(true, "alert", "hello world!");
// var cache = {};
// var generated = new Function(ir.compile(cache)).bind(cache);
// generated();
// cache[ir.params[0].id] = "haaax"
// generated();
// ```
//
please.JSIR = function (force_dynamic, method_string) {
    var args = Array.apply(null, arguments).slice(2);
    this.method = method_string;
    this.params = [];
    this.dirty = true;
    ITER(a, args) {
        var is_dynamic = force_dynamic || args[a].constructor === Function;
        this.params.push({
            "id" : please.uuid(),
            "value" : args[a],
            "dynamic" : is_dynamic,
        });
    }
};


please.JSIR.prototype.compile = function (cache) {
    var args = [this.method];
    ITER(p, this.params) {
        var lookup, param = this.params[p];
        if (param.dynamic) {
            if (param.value.constructor === Function) {
                cache[param.id] = param.value();
            }
            else {
                cache[param.id] = param.value;
            }
            lookup = 'this["' + param.id + '"]';
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


// [+] please.__drawable_ir(vbo, ibo, start, total, defaults, graph_node)
// 
// Creates a list of IR objects needed to render a partical VBO/IBO of
// data.  The only required param is 'vbo'.
//
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
please.__drawable_ir = function (vbo, ibo, start, total, defaults, graph_node) {
    var ir = [];
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
    }
    return src;
};
