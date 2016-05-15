// - gl_ast/ast.macros.js --------------------------------------------- //


/*
 *  This file is where non-standard extensions to GLSL syntax and
 *  related helper functions should ideally be defined.
 */


// Find include statements in the provided near-complete syntax tree.
//
// WORDS OF CAUTION:
//
// This doesn't modify the tokens in any way whatsoever, it just
// detects what files need to be included.  These tokens will then
// just be ignored when the global scope is printed.
//
please.gl.macros.include = function (ast) {
    ITER(i, ast.data) {
        var item = ast.data[i];
        var next = ast.data[i+1] || "end of token stream";
        if (item.constructor == please.gl.ast.Invocation && item.name == "include") {
            var args = item.args.data;
            try {
                console.assert(item.bound == false);
                console.assert(args.length == 1);
                console.assert(args[0].constructor == please.gl.ast.Comment);
                console.assert(args[0].quotation);
            } catch (error) {
                console.warn(error);
                throw new Error("Malformed include statement on line " +
                                item.meta.line + " at char " + item.meta.char +
                                " in file " + item.meta.uri);
            }
            if (next != ';') {
                throw new Error("Expected ';' after include statement on line " +
                                item.meta.line + " at char " + item.meta.char +
                                " in file " + item.meta.uri);                
            }
            item.is_include_macro = true;
            var uri = args[0].data;
            ast.inclusions.push(uri);
        }
    };
};


// Recieves a dictionary of global variables, returns support code.
please.gl.macros.curve = function (globals) {
    var out = "";
    var types = [];
    var template = please.access("curve_template.glsl").src;
    ITER_PROPS(name, globals) {
        var global = globals[name];
        if (global.macro == "curve") {
            var signature = global.type + ":" + global.size;
            if (types.indexOf(signature) == -1) {
                types.push(signature);
            }
        }
    };
    ITER(i, types) {
        var parts = types[i].split(":");
        var type = parts[0];
        var size = parts[1];
        out += template.replace(/GL_TYPE/gi, type).replace(/ARRAY_LEN/gi, size);
    }
    return out;
};


//
please.gl.macros.rewrite_swappable = function (method, available) {
    var lookup = {};
    ITER(a, available) {
        var pick = available[a];
        if (pick.macro == "plugin") {
            lookup[pick.name] = pick;
        }
    }
    console.assert(method.dynamic_globals.length == 1);

    var original = method.print().split('\n');
    var args = method.input.map(function (arg) {
        return arg[1];
    }).join(", ");
    
    var uniform = method.dynamic_globals[0].name;
    var order = method.enumerate_plugins(available);
    if (order.length == 1) {
        return original.join("\n");
    }
    
    var body = '';
    var cases = [];
    ITER(i, order) {
        if (i > 0) {
            var clause = '';
            clause += 'if ('+uniform+'=='+i+') {\n';
            clause +=  '  return ' + order[i] + '(' + args + ');\n';
            clause += '}\n';
            cases.push(clause);
        }
    }
    body += cases.join("else ");
    body += 'else {\n';
    body += original.slice(1, -2).join('\n') + '\n';
    body += '}';

    var out = original[0] + '\n';
    var parts = body.split('\n');
    ITER(i, parts) {
        out += '  ' + parts[i] + '\n';
    }
    out += '}\n'
    return out;
};
