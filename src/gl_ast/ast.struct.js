// - gl_alst/ast.struct.js ----------------------------------------------- //


/* [+] please.gl.ast.Struct(name, stream)
 * 
 * AST constructor function representing Structs definitions.
 * 
 */
please.gl.ast.Struct = function (name, stream) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.name = name;
    this.data = stream;
    this.defs = [];

    var cache = null;
    ITER(i, this.data) {
        var token = this.data[i];
        if (!cache) {
            if (token == ';') {
                please.gl.ast.error(token, "Expected non-semicolon token.");
            }
            if (token.constructor != String) {
                please.gl.ast.error(token, "Expected string.");
            }
            else {
                cache = token;
            }
        }
        else {
            if (token == ';') {
                var parts = cache.split(" ");
                if (parts.length != 2) {
                    please.gl.ast.error(cache, "Expected two tokens.");
                }
                this.defs.push(parts);
                cache = null;
            }
            else {
                please.gl.ast.error(token, "Expected semicolon.");
            }
        }
    }
};


please.gl.ast.Struct.prototype.print = function () {
    var out = 'struct ' + this.name + ' {\n';
    ITER(i, this.defs) {
        out += '  ' + this.defs[i][0] + ' ' + this.defs[i][1] + ';\n';
    }
    out += '};\n';
    return out;
};


/* [+] please.gl.__cmp_structs(struct_a, struct_b)
 * 
 * Determines if two struct tokens are equivalent.  Throws an error if
 * the two structs share a name, but have different bodies.
 * 
 */
please.gl.__cmp_structs = function (lhs, rhs) {
    if (lhs.name != rhs.name) {
        return false;
    }
    var error_msg = "Mismatched redundant struct definition."
    if (lhs.defs.length != rhs.defs.length) {
        please.gl.ast.error(rhs, error_msg);
    }
    ITER(i, lhs.defs) {
        if (lhs.defs[i] != rhs.defs[i]) {
            please.gl.ast.error(rhs, error_msg);
        }
    }
    return true;
};


// Identify tokens that describe a struct and replace them with a
// Struct object.
please.gl.__identify_structs = function (ast) {
    var remainder = [];
    var cache = [];

    var evaluate_cache = function () {
        var name_parts = cache[0].split(" ");
        if (name_parts.length != 2) {
            please.gl.ast.error(
                cache[0],
                "Wrong number of tokens at beginning of struct declaration.");
        }
        if (cache.length < 3) {
            please.gl.ast.error(cache.slice(-1), "Malformed struct.");
        }
        if (cache[1].constructor !== please.gl.ast.Block) {
            please.gl.ast.error(cache[1], "Expected block.");
        }
        if (cache[2] != ';') {
            please.gl.ast.error(cache[2], "Expected semicolon.");
        }
        console.assert(cache.length == 3);
        console.assert(cache[1].type == null);

        // ok, checks pass, this is probaly well formed, at least
        // outside of the braces

        var name = name_parts[1];
        var data = cache[1].data;
        var struct = new please.gl.ast.Struct(name, data);
        
        remainder.push(struct);
    };

    ITER(i, ast) {
        var token = ast[i];
        if (cache.length > 0) {
            if (token.constructor == please.gl.ast.Comment) {
                remainder.push(token);
            }
            else {
                cache.push(token);
                if (token == ";") {
                    evaluate_cache();
                }
            }
        }
        else {
            if (token.constructor == String && token.startsWith("struct")) {
                cache.push(token);
            }
            else {
                remainder.push(token);
            }
        }
    }
    return remainder;
};
