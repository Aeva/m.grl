// - glslglsl/ast.block.js ----------------------------------------------- //


/* [+] please.gl.ast.Block(stream, type)
 * 
 * AST constructor function representing blocks.  For the sake of
 * simplicity, a source file's outter most scope is assumed to be an
 * implicit block.  This is denoted by the 'type' property of the
 * block being set to "global".
 * 
 */
please.gl.ast.Block = function (stream, type) {
    console.assert(this !== window);
    this.data = stream;
    this.type = type || null;
    this.prefix = null;
};
please.gl.ast.Block.prototype.print = function () {
    var flat = "";
    var out = "";

    ITER(i, this.data) {
        var token = this.data[i];
        if (token.print) {
            flat += token.print();
        }
        else {
            flat += token;
            if (token === ";") {
                flat += "\n";
            }
        }
    };

    if (this.type !== "global") {
        var indented = "";
        var lines = flat.split("\n");
        ITER(i, lines) {
            var line = lines[i];
            if (line.trim() !== "") {
                indented += "  " + line + "\n";
            }
        };
        out = (this.prefix || "") + " {\n" + indented + "}\n";
    }
    else {
        out = flat;
    }

    return out;
};
please.gl.ast.Block.prototype.make_function = function (prefix) {
    this.type = "function";

    this.name = prefix[0].split(" ")[1];
    this.input = []; // arguments eg [['float', 'foo'], ['float', 'bar']]
    this.output = prefix[0].split(" ")[0]; // return type eg 'float'

    var arg_parts = prefix.slice(2, -1).join("").split(",");
    if (arg_parts.length > 1 && !(arg_parts.length == 1 && arg_parts[0] == "void")) {
        ITER(i, arg_parts) {
            this.input.push(arg_parts[i].split(" "));
        };
    }

    Object.defineProperty(this, "prefix", {
        get: function () {
            var prefix = this.output + " " + this.name + "(";
            var parts = [];
            ITER(i, this.input) {
                parts.push(this.input[i][0] + " " + this.input[i][1]);
            }
            prefix += parts.join(", ") + ")";
            return prefix;
        },
    });

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
