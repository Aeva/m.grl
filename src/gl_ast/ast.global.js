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
please.gl.ast.Global = function (mode, type, name, value) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.mode = mode;
    this.type = type;
    this.name = name;
    if (mode === "const") {
        this.value = value;
    }
};
please.gl.ast.Global.prototype.print = function () {
    var out = ""
    out += this.mode + " ";
    out += this.type + " ";
    out += this.name;
    if (this.mode === "const") {
        out += " = " + this.value;
    }
    out += ";\n";
    return out;
};


// This method takes a stream of tokens and parses out the glsl
// globals from them.  Returns two lists, the first containing all of
// the Global ast items that were extracted, the second is a list of
// the remaining stream with the Globals removed.
please.gl.__parse_globals = function (stream) {
    var defs = [];
    var modes = ["uniform", "attribute", "varying", "const"];
    var globals = [];
    var chaff = [];

    ITER(i, stream) {
        var statement = stream[i];
        var selected = false;
        if (statement.constructor == String) {
            ITER(m, modes) {
                var mode = modes[m];
                if (statement.startsWith(mode)) {
                    var sans_mode = statement.slice(mode.length+1);
                    var type = sans_mode.split(" ")[0];
                    var remainder = sans_mode.slice(type.length+1);

                    if (mode == "const") {
                        var look_ahead = [];
                        for (var a=i+1; a<stream.length; a+=1) {
                            var peek = stream[a];
                            if (peek.constructor == String) {
                                if (peek == ";") {
                                    break;
                                }
                                else {
                                    look_ahead.push(peek);
                                }
                            }
                            else if (peek.print) {
                                look_ahead.push(peek);
                            }
                        }
                        console.assert(look_ahead.length >= 2);
                        console.assert(look_ahead[0] == "=");
                        remainder = [remainder].concat(look_ahead);
                        remainder = please.gl.__identify_parentheticals(remainder);
                        // make sure the look_ahead stuff is removed
                        i += look_ahead.length;
                    }
                    
                    defs.push({
                        mode: mode,
                        type: type,
                        data: remainder,
                        meta: statement.meta,
                    });
                    selected = true;
                    i += 1; // skip the next token because it is a ';'
                    break;
                }
            }
        }
        if (!selected) {
            chaff.push(statement);
        }
    }

    ITER(i, defs) {
        var def = defs[i];
        var mode = def.mode;
        var type = def.type;
        var names = [];
        if (mode == "const") {
            var cache = [];
            ITER(n, def.data) {
                if (def.data[n] == ",") {
                    names.push(cache);
                    cache = [];
                }
                else {
                    cache.push(def.data[n]);
                }
            }
            if (cache.length > 0) {
                names.push(cache);
            }
        }
        else {
            var names = def.data.split(",");
        }
        ITER(n, names) {
            var name;
            var value;
            var global = null;
            var parts = names[n];
            if (mode === "const") {
                name = parts[0].trim();
                // skip the second part, too, because it is an '='.
                var tmp = parts.slice(2);
                ITER(k, tmp) {
                    if (tmp[k].print) {
                        tmp[k] = tmp[k].print();
                    }
                }
                value = tmp.join(" ");
                global = new please.gl.ast.Global(mode, type, name, value);
            }
            else {
                name = parts.trim();
                value = undefined;
            }
            global = new please.gl.ast.Global(mode, type, name, value);
            global.meta = def.meta;
            globals.push(global);
        }
    };
     
    return [globals, chaff];
};
