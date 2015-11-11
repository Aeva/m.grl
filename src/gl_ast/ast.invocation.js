// - gl_alst/ast.invocation.js ------------------------------------------- //


/* [+] please.gl.ast.Invocation(name, args)
 * 
 * AST constructor function representing function calls.
 * 
 */
please.gl.ast.Invocation = function (name, args) {
    this.name = name || null;
    this.args = args || null;
};


// Prints the glsl for this object.
please.gl.ast.Invocation.prototype.print = function () {
    return this.name + this.args.print()
};


// Identify function calls and collapse the relevant ast together.
please.gl.__identify_invocations = function (ast) {
    var ignore = [
        "for",
        "if",
        "else",
        "while",
        "do",
    ];
    var remainder = [];
    ITER(i, ast) {
        var item = ast[i];
        var uncaught = true;
        if (item.constructor == please.gl.ast.Parenthetical) {
            var peek = null;
            for (var k=i-1; k>=0; k+=1) {
                if (ast[k].constructor != please.gl.ast.Comment) {
                    peek = ast[k];
                    break;
                }
            }
            if (peek && peek.constructor == String) {
                uncaught = false;
                ITER(s, ignore) {
                    var check = ignore[s];
                    if (peek == check) {
                        uncaught = true;
                        break;
                    }
                }
                if (!uncaught) {
                    remainder = remainder.slice(0, k);
                    remainder.push(new please.gl.ast.Invocation(peek, item));
                }
            }
        }
        if (uncaught) {
            remainder.push(item);
        }
    }
    return remainder;
};


//
please.gl.__bind_invocations = function (stream, methods_set, scope) {
    if (!scope) {
        scope = {};
        ITER(i, methods_set) {
            scope[methods_set[i].name] = methods_set[i];
        }
    }

    var add_binding = function (invocation, method) {
        Object.defineProperty(item, "name", {get: function () {
            return method.name;
        }});
    };

    ITER(i, stream) {
        var item = stream[i];
        if (item.constructor == please.gl.ast.Invocation) {
            if (scope[item.name]) {
                // add a binding
                console.info("FOUND: " + item.name);
                add_binding(item, scope[item.name]);
            }
            please.gl.__bind_invocations(item.args, null, scope);
        }
        else if (item.constructor == please.gl.ast.Block || item.constructor == please.gl.ast.Parenthesis) {
            please.gl.__bind_invocations(item.data, null, scope);
        }
    }
};