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
please.gl.ast.Global = function (mode, type, name, value, qualifier, macro) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.mode = mode;
    this.type = type;
    this.name = name;
    this.macro = macro;
    this.qualifier = qualifier;
    if (mode === "const") {
        this.value = value;
    }
};
please.gl.ast.Global.prototype.print = function () {
    if (macro) {
        return this.__print_macro();
    }
    var out = "";
    out += this.mode + " ";
    if (this.qualifier !== null) {
        out += this.qualifier + " ";
    }
    out += this.type + " ";
    out += this.name;
    if (this.mode === "const") {
        out += " = " + this.value;
    }
    out += ";\n";
    return out;
};
please.gl.ast.Global.prototype.__print_macro = function () {
    if (this.macro == "curve") {
        return this.__print_curve_macro();
    }
    throw("no such macro: " + this.macro);
};
please.gl.ast.Global.prototype.__print_curve_macro = function () {
    console.assert(this.mode == "uniform");    
    console.assert(this.macro == "curve");

    var out = "uniform ";
    if (this.qualifier) {
        out += this.qualifier + " ";
    }
    out += this.type + " ";
    out += this.name;
    // FIXME: add array size thingy
    return out;
};


// This method takes a stream of tokens and parses out the glsl
// globals from them.  Returns two lists, the first containing all of
// the Global ast items that were extracted, the second is a list of
// the remaining stream with the Globals removed.
please.gl.__parse_globals = function (stream) {
    var defs = [];
    var macros = ["curve"];
    var modes = ["uniform", "attribute", "varying", "const"];
    var qualifiers = ["highp", "mediump", "lowp"];
    var globals = [];
    var chaff = [];

    // The 'sans_mode' argument in the following methods is the token
    // list for the identified global definition sans the mode token.

    // Used to identify the precision qualifier and remove them from
    // the token list.
    var find_qualifier = function (sans_mode) {
        var qualifier = null;
        ITER(q, qualifiers) {
            if (sans_mode[0] == qualifiers[q]) {
                qualifier = qualifiers[q];
                sans_mode.shift();
                break;
            }
        }
        return qualifier;
    };

    // Used to identify custom macro keywords and remove them from the
    // token list
    var find_macro = function (sans_mode) {
        var macro = null;
        ITER(m, macros) {
            if (sans_mode[0] == macros[m]) {
                macro = macros[m];
                sans_mode.shift();
                break;
            }
        }
        return macro;
    };

    // Iterate through the stream of tokens and look for one that
    // denotes a global eg 'uniform'.  If found, this is known as the
    // mode.
    ITER(i, stream) {
        var token = stream[i];
        var selected = false;
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
                // Found a global, so remove the rest of the statement
                // from the stream and push it onto a queue.
                var sans_mode = token.slice(mode.length).trim().split(" ");
                var qualifier = find_qualifier(sans_mode);
                var macro = null;
                if (mode == "uniform") {
                    macro = find_macro(sans_mode);
                    if (macro && !qualifier) {
                        qualifier = find_qualifier(sans_mode);
                    }
                }
                
                var data_type = sans_mode[0];
                var statement = sans_mode.slice(1);
                for (var p=i+1; p<stream.length; p+=1) {
                    var test = stream[p];
                    if (test == ";") {
                        break;
                    }
                    else {
                        if (test.print) {
                            test = test.print();
                        }
                        statement.push(test);
                    }
                }
                statement = please.gl.__identify_parentheticals(statement);
                i = p; // seek to the end of the statement
                
                defs.push({
                    mode: mode,
                    type: data_type,
                    data: statement,
                    meta: token.meta,
                    macro: macro,
                    qualifier: qualifier,
                });
                selected = true;
            }
        }
        if (!selected) {
            chaff.push(token);
        }
    }

    // Iterate through the queue of globals found and creates the
    // according AST object.
    ITER(i, defs) {
        var def = defs[i];
        var mode = def.mode;
        var type = def.type;
        var names = [];
        var macro = def.macro;
        var qualifier = def.qualifier;
        var test, cache = [];
        ITER(p, def.data) {
            test = def.data[p];
            if (test == ",") {
                names.push(cache);
                cache = [];
            }
            else {
                if (test.print) {
                    test = test.print();
                }
                cache.push(test);
            }
        }
        if (cache.length > 0) {
            names.push(cache);
        }
        
        ITER(n, names) {
            var parts = names[n];
            var global = null;
            var name, value;

            if (mode === "const") {
                name = parts[0].trim();
                // skip the second part, too, because it is an '='.
                var tmp = parts.slice(2);
                value = tmp.join("");
            }
            else {
                name = parts[0];
                value = null;
            }
            global = new please.gl.ast.Global(
                mode, type, name, value, qualifier, macro);
            global.meta = def.meta;
            globals.push(global);
        }
    };

    return [globals, chaff];
};
