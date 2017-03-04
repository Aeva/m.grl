// - gl_ast/ast.function_prototype.js ------------------------------------ //


/* [+] please.gl.ast.Prototype(prefix, params)
 * 
 * AST constructor function representing function calls.
 * 
 */
please.gl.ast.FunctionPrototype = function (prefix, params) {
    please.gl.ast.mixin(this);
    prefix = prefix.split(" ");
    this.name = prefix[1];
    this.output = prefix[0];
    this.input = [];

    if (params !== null) {
        if (params.constructor !== please.gl.ast.Parenthetical) {
            throw new Error("Malformed function prototype: " + invocation);
        }
        else if (!params.is_flat) {
            throw new Error("Nested parenthesis in prototype params: " + invocation);
        }
        var arg_parts = please.gl.__trim(params.data.join("").split(","));
        if (!(arg_parts.length == 1 && arg_parts[0] == "void")) {
            ITER(i, arg_parts) {
                this.input.push(arg_parts[i].split(" "));
            };
        }
    }
    
    Object.defineProperty(this, "signature", {
        get: function () {
            var sig = this.output;
            ITER(i, this.input) {
                sig += ":" + this.input[i][0];
            }
            return sig;
        },
    });
};


// Prints the glsl for this object.
please.gl.ast.FunctionPrototype.prototype.print = function () {
    var ret = this.output + " " + this.name + "(";
    var parts = [];
    ITER(i, this.input) {
        parts.push(this.input[i].slice(0,-1).join(" "));
    }
    ret += parts.join(", ") + ");\n";
    return ret;
};


// Searches through the ast for invocation objects that are actually
// function prototypes, and replaces them as such.
please.gl.__identify_prototypes = function (ast) {
    var new_ast = [];
    var name_regex = /^(?:[a-zA-Z_-][a-zA-Z0-9_-])+ (?:[a-zA-Z_-][a-zA-Z0-9_-])+$/;
    ITER(i, ast) {
        var item = ast[i];
        if (item.constructor == please.gl.ast.Invocation && name_regex.exec(item.name) !== null) {
            var proto = new please.gl.ast.FunctionPrototype(item.name, item.args);
            proto.meta = item.meta;
            new_ast.push(proto);
        }
        else {
            new_ast.push(item);
        }
    }

    return new_ast;
};


// Remove duplicates and verify that the provided collection of hoists
// does not contain any conflicting type signatures.
please.gl.__reduce_hoists = function(hoists) {
    var found = {};
    var new_set = [];
    ITER(h, hoists) {
        var proto = hoists[h];
        var repr = proto.print();
        if (!found[repr]) {
            found[repr] = true;
            new_set.push(proto);
        }
    }
    return new_set;
};
