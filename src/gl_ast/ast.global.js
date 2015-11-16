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
                var sans_mode = token.slice(mode.length).trim().split(" ");
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
                });
                selected = true;
            }
        }
        if (!selected) {
            chaff.push(token);
        }
    }

    ITER(i, defs) {
        var def = defs[i];
        var mode = def.mode;
        var type = def.type;
        var names = [];
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
                value = undefined;
            }
            global = new please.gl.ast.Global(mode, type, name, value);
            global.meta = def.meta;
            globals.push(global);
        }
    };
     
    return [globals, chaff];
};
