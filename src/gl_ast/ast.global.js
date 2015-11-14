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
    if (type === "const") {
        this.value = value;
    }
};
please.gl.ast.Global.prototype.print = function () {
    var out = ""
    out += this.mode + " ";
    out += this.type + " ";
    out += this.name;
    if (this.type === "const") {
        out += "=" + this.value;
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
        var names = def.data.split(",");
        ITER(n, names) {
            var name = names[n].trim();
            var value = undefined;
            if (type === "const") {
                var parts = name.split("=");
                value = parts[0].trim();
                name = parts[1].trim();
            }
            var global = new please.gl.ast.Global(mode, type, name, value);
            global.meta = def.meta;
            globals.push(global);
        }
    };
     
    return [globals, chaff];
};
