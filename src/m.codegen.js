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
// ```
// var ir = please.JSIR("alert", "hello world!");
// var cache = {};
// var generated = new Function(ir.compile(cache)).bind(cache);
// generated();
// ```
//
please.JSIR = function (method_string) {
    var args = Array.apply(null, arguments).slice(1);
    this.method = method_string;
    this.params = [];
    ITER(a, args) {
        this.params.push({
            "id" : please.uuid(),
            "value" : args[a],
        });
    }
};

please.JSIR.prototype.compile = function (cache) {
    var args = [this.method];
    ITER(p, this.params) {
        var param = this.params[p];
        cache[param.id] = param.value;
        var lookup = 'this["' + param.id + '"]';
        args.push(lookup);
    }
    return please.format_invocation.apply(please, args);
};