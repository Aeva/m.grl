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
    this.value = null;
    this.binding_contexts = {};
    if (value) {
        this.value = "";
        ITER(t, value) {
            var token = value[t];
            if (token.constructor == String) {
                this.value += token;
            }
            else if (token.print) {
                this.value += token.print();
            }
            else {
                throw new Error("Unable to print token: " + token);
            }
        }
    }
};
please.gl.ast.Global.prototype.print = function () {
    var out = "";
    if (this.mode) {
        out += this.mode + " ";
    }
    if (this.qualifier !== null) {
        out += this.qualifier + " ";
    }
    out += this.type + " ";
    out += this.name;
    if (this.size) {
        out += "[" + this.size + "]";
    }
    if (this.value) {
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


// This method takes a list of tokens and the desired starting index
// and returns a list of objects containing valid arguments to the
// Global constructor if the first token represent a valid global
// variable declaration, otherwise this method returns null.  If a
// global is detected, this function also reports how many tokens it
// would consume.
//
// The following should be valid token streams:
// - ['uniform lowp float test', ';']
// - ['uniform float foo', '[', '16', ']', ';']
// - ['const vec2 foo', '=', 'vec2', '(', '1.0', ',', '2.0', ')', ';']
// - ['uniform float foo', ',', 'bar', ';'];
please.gl.__identify_global = (function() {
    var modes = [
        "uniform", "attribute", "varying", "const",
        "uniform curve",
    ];
    var precisions = ["lowp", "mediump", "highp"];

    var format_option = function (set) {
        return set.map(function (str) { return str+" "; }).join("|");
    };

    var mode_pattern = "(" + format_option(modes) + ")? ?";
    var precision_pattern = "(" + format_option(precisions) + ")? ?";
    var type_pattern = "([a-zA-Z_][a-zA-Z0-9_]+)";
    var names_pattern = "((?:[a-zA-Z_][a-zA-Z0-9_]+(?:\\[[0-9]+\\])?)" +
        "(?:, ?[a-zA-Z_][a-zA-Z0-9_]+(?:\\[[0-9]+\\])?)*)";
    var assign_pattern = "(;|=)";

    var regex = new RegExp(
        "^" +
        mode_pattern +
        precision_pattern +
        type_pattern + " " +
        names_pattern +
        assign_pattern +
        "$");

    var name_regex = new RegExp("([a-zA-Z_][a-zA-Z0-9_]+)(\\[[0-9]+\\])?");

    
    var assign_name = function (value) {
        return value === undefined ? null : value.trim();
    }
    var assign_number = function (value) {
        return value === undefined ? null : Number(value.slice(1,-1));
    }
        
    return function (stream, start) {
        var found = [];
        var token = stream[start];
        if (token.constructor == String && token != ";") {
            var next_token = "";
            for (var n=start+1; n<stream.length; n+=1) {
                if (stream[n].constructor == please.gl.ast.Comment) {
                    continue;
                }
                else if (stream[n].constructor == String) {
                    next_token += stream[n];
                    if (stream[n] == ";" || stream[n] == "=") {
                        break;
                    }
                }
                else {
                    break;
                }
            }
            var match = (token + next_token).match(regex);            
            if (match) {
                var name_line = match[4];
                var names = null;;
                if (name_line.indexOf(",") > -1) {
                    names = name_line.split(",").map(String.trim);
                }
                else {
                    names = [name_line];
                }
                for (var end=start+1; end<stream.length; end+=1) {
                    if (stream[end] == ";") {
                        break;
                    }
                }
                var tokens = stream.slice(start, end+1);
                ITER(n, names) {
                    var name = names[n].match(name_regex);
                    found.push({
                        "mode" : assign_name(match[1]),
                        "type" : match[3],
                        "name" : name[1],
                        "size" : assign_number(name[2]),
                        "precision" : assign_name(match[2]),
                        "assignment" : match[5] == "=",
                        "tokens" : tokens,
                    });
                }
            }
        }
        return found;
    }
})();


// This method takes a stream of tokens and parses out the glsl
// globals from them.  Returns two lists, the first containing all of
// the Global ast items that were extracted, the second is a list of
// the remaining stream with the Globals removed.
please.gl.__parse_globals = (function () {
    var context_pattern = new RegExp("^binding_context (.+)$");

    return function (stream) {
        var globals = [];
        var chaff = [];
        
        // Iterate through the stream of tokens and look for one that
        // denotes a global variable eg a uniform var.  If found, invoke
        // please.gl.__create_global with the stream from the 'mode' token
        // up to the first semicolon and add the result to the 'globals'
        // list and increment i.
        ITER(i, stream) {
            var context_match = stream[i].match ? stream[i].match(context_pattern) : null;
            if (context_match) {
                var context = context_match[1];
                var block = stream[i+1];
                if (context !== "GraphNode") {
                    please.gl.ast.error(
                        stream[i], "Invalid binding context: " + context);
                }
                else if (!block || block.constructor !== please.gl.ast.Block) {
                    please.gl.ast.error(
                        stream[i],
                        "Expected '{' after binding_context declaration.");
                }
                else if (block.type !== null) {
                    please.gl.ast.error(
                        stream[i],
                        "Expected unknown block ast object, got '" +
                            block.type + "' instead.");
                }
                else {
                    // ok looks good, lets create some globals
                    var found = please.gl.__parse_globals(block.data);
                    if (found[1].length > 0) {
                        please.gl.ast.error(
                            found[1][0],
                            "Invalid token in binding_context block.");
                    }
                    if (found[0].length > 0) {
                        found = found[0];
                        ITER(b, found) {
                            var bind = found[b];
                            if (bind.mode !== "attribute" && bind.mode !== "uniform") {
                                please.gl.ast.error(
                                    bind,
                                    "Only uniform and attribute variables may be given a binding context.");
                            }
                            else {
                                // TODO add context before adding to globals
                                globals.push(bind);
                            }
                        }
                    }
                    i += 1; // increment to skip over the block
                }
            }
            else {
                var found = please.gl.__identify_global(stream, i);
                if (found.length > 0) {
                    i += found[0].tokens.length-1;
                    ITER(g, found) {
                        var global_info = found[g];
                        globals.push(please.gl.__create_global(global_info));
                    }
                }
                else {
                    chaff.push(stream[i]);
                }
            }
        }
        return [globals, chaff];
    };
})();


// This method takes a "global_info" object generated by the
// __identify_global method in this file, and returns an ast object.
please.gl.__create_global = function (info_dict) {
    // info_dict property names are as follows:
    // info, type, name, size, precision, assignment, tokens

    // determine if a macro or mode are available
    var macro = null;
    var mode = null;
    if (info_dict.mode) {
        var mode_parts = info_dict.mode.split(" ");
        if (mode_parts.length == 2) {
            mode = mode_parts[0];
            macro = mode_parts[1];
        }
        else if (mode_parts.length == 1) {
            mode = mode_parts[0];
        }
        else if (mode_parts.length > 2) {
            throw new Error("Malformed global");
        }
    }

    // determine what is being assigned to the global, if anything
    var assignment = null;
    if (info_dict.assignment) {
        if (mode == "uniform" || mode == "attribute" || mode == "varying") {
            throw new Error(
                "Definitions for "+mode+" variables can't be assgined a value.");
        }
        var tokens = info_dict.tokens;
        var start = null;
        ITER(i, tokens) {
            if (tokens[i] == "=") {
                start = i+1;
                break;
            }
        }
        assignment = tokens.slice(start, -1);
    }
    else if (mode == "const") {
        throw new Error("Const global should be assigned a value.");
    }

    // create and return the new ast object:
    var global = new please.gl.ast.Global(
        mode,
        info_dict.type,
        info_dict.name,
        assignment,
        info_dict.size,
        info_dict.precision,
        macro);
    
    global.meta = info_dict.tokens[0].meta;
    return global;
};