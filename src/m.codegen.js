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


please.JSIR.prototype.update_arg = function (index, value) {
    var param = this.params[index];
    if (!param.dynamic) {
        this.dirty = true;
    }
    param.value = value;
    param.dynamic = true;
};
