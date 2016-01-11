// - gl_ast/ast.global.js --------------------------------------------- //


/* [+] please.gl.ast.Global(text)
 * 
 * A global variable declaration.  This is used for the following
 * types of glsl global variables:
 *
 *  - uniform
 *  - varying
 *  - attribute
 *  - constant
 *
 */
please.gl.ast.Global = function (mode, type, name, value, size, qualifier, macro) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.enum = [];
    this.mode = mode;
    this.type = type;
    this.name = name;
    this.size = size;
    this.macro = macro;
    this.rewrite = null;
    this.qualifier = qualifier;
    if (mode === "const") {
        this.value = value;
    }
};
please.gl.ast.Global.prototype.print = function () {
    var out = "";
    out += this.mode + " ";
    if (this.qualifier !== null) {
        out += this.qualifier + " ";
    }
    out += this.type + " ";
    out += this.name;
    if (this.size) {
        out += "[" + this.size + "]";
    }
    if (this.mode === "const") {
        out += " = " + this.value;
    }
    out += ";\n";
    return out;
};


// Throw an error when two globals contradict one another.
please.gl.__check_for_contradicting_globals = function (lhs, rhs) {
    if (lhs.print() != rhs.print()) {
        var msg = "Contradicting definitions for global '" + name + "':\n";
        msg += "definition 1: " + please.gl.ast.format_metadata(lhs) + "\n";
        msg += "definition 2: " + please.gl.ast.format_metadata(rhs) + "\n";
        throw new Error(msg);
    }
};


// Call on a list of Globals to remove redundant declarations and
// throw errors for contradictions.
please.gl.__clean_globals = function (globals) {
    var revised = [];
    var by_name = {};
    globals.map(function (global) {
        if (!by_name[global.name]) {
            by_name[global.name] = [];
            revised.push(global);
        }
        by_name[global.name].push(global);
    });
    please.prop_map(by_name, function (name, set) {
        set.reduce(please.gl.__check_for_contradicting_globals);
    });
    return revised;
};


// This method takes a stream of tokens and parses out the glsl
// globals from them.  Returns two lists, the first containing all of
// the Global ast items that were extracted, the second is a list of
// the remaining stream with the Globals removed.
please.gl.__parse_globals = function (stream) {
    var modes = ["uniform", "attribute", "varying", "const"];
    var globals = [];
    var chaff = [];

    // Iterate through the stream of tokens and look for one that
    // denotes a global eg 'uniform'.  If found, invoke
    // please.gl.__create_global with the stream from the 'mode' token
    // up to the first semicolon and add the result to the 'globals'
    // list and increment i.
    ITER(i, stream) {
        var token = stream[i];
        if (token.constructor == String) {
            var mode = null;
            ITER(m, modes) {
                var test = modes[m];
                if (token.startsWith(test)) {
                    mode = test;
                    break;
                }
            }
            if (mode) {
                for (var end=i+1; end<stream.length; end+=1) {
                    if (stream[end] == ";") {
                        break;
                    }
                }
                var created = please.gl.__create_global(stream.slice(i, end));
                ITER(g, created) {
                    globals.push(created[g]);
                }
                i = end;
                continue;
            }
        }
        chaff.push(token);
    }
    return [globals, chaff];
};


// Takes a stream of tokens and produces a Global AST object from it.
// Input tokens are delimited by symbols, but not by spaces.
// For example:
// - ['uniform lowp float test']
// - ['uniform float foo', '[', '16', ']']
// - ['const vec2 foo', '=', 'vec2', '(', '1.0', ',', '2.0', ')']
// - ['uniform float foo', ',', 'bar'];
please.gl.__create_global = function (tokens) {
    var find = function (keywords, words) {
        var keyword = null;
        ITER(w, words) {
            ITER(k, keywords) {
                if (words[w] == keywords[k]) {
                    keyword = keywords[k];
                    break;
                }
            }
        }
        return keyword;
    }

    var split = function (delim, tokens) {
        var parts = [];
        var acc = [];
        ITER(i, tokens) {
            var token = tokens[i];
            if (token == delim) {
                parts.push(acc);
                acc = [];
                continue
            }
            else {
                acc.push(token);
            }
        }
        if (acc.length > 0) {
            parts.push(acc);
        }
        return parts;
    };

    var macros = ["curve"];
    var precisions = ["highp", "mediump", "lowp"];

    var tokens = please.gl.__identify_parentheticals(tokens);
    var words = tokens[0].split(' ');
    var mode = words[0];
    var meta = tokens[0].meta;
    var macro = find(macros, words);
    var precision = find(precisions, words);

    var qualifiers = (!!macro) + (!!precision); // produces an integer
    for (var i=0; i<qualifiers; i+=1) {
        var test = words[i+1];
        if (macros.concat(precision).indexOf(test) == -1) {
            throw new Error("Malformed global");
        }
    }
    var remainder = words.slice(qualifiers+1).concat(tokens.slice(1));
    var type = remainder.shift();
    var names = split(',', remainder);
    var created = [];
    ITER(i, names) {
        var def = names[i];
        var name = def[0];
        var size = null;
        var value = null;
        
        var parts = split('=', def);
        var lhs = parts[0];
        var rhs = parts.slice(1)[0];
        if (rhs && rhs.length > 0) {
            value = please.gl.ast.flatten(rhs);
        }
        if (lhs[1] !== undefined) {
            console.assert(lhs[1].constructor == please.gl.ast.Parenthetical);
            console.assert(lhs[1].type == "square");
            console.assert(lhs[1].data.length == 1);
            size = parseInt(lhs[1].data[0]);
        }
        var global = new please.gl.ast.Global(
            mode, type, name, value, size, precision, macro);
        global.meta = tokens[0].meta;
        created.push(global);
    }
    return created;
};