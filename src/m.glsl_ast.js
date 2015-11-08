// - m.glsl_ast.js ------------------------------------------------------- //


please.gl.ast = {};



/* [+] please.gl.ast.Comment(text, multiline)
 *
 * AST constructor function representing code comments.
 *
 */
please.gl.ast.Comment = function (text, multiline) {
    console.assert(this !== window);
    this.multiline = !!multiline;
    this.data = text;
};
please.gl.ast.Comment.prototype.print = function () {
    if (this.multiline) {
        return "/*" + this.data + "*/";
    }
    else {
        return "//" + this.data + "\n";
    }
};



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
        out = " {\n" + indented + "}\n";
    }
    else {
        out = flat;
    }

    return out;
};



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



// Removes the "precision" statements from the ast.
please.gl.__remove_precision = function (ast) {
    var remainder = [];
    ITER(i, ast) {
        var statement = ast[i];
        if (statement.constructor == String && statement.startsWith("precision")) {
            i += 1;
            continue;
        }
        else {
            remainder.push(statement);
        }
    }
    return remainder;
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
            globals.push(new please.gl.ast.Global(mode, type, name, value));
        }
    };
     
    return [globals, chaff];
};



// This method takes the glsl source, isolates which sections are
// commented out, and returns a list of Comment objects and strings.
// This is the very first step in producing the token stream.
please.gl.__find_comments = function (src) {
    var open_regex = /(?:\/\/|\/\*)/m;
    var open = open_regex.exec(src);
    if (open === null) {
        return [src];
    }
    open = open[0];
    var close = open === "/*" ? "*/" : "\n";
    var tokens = [];
    var start = src.indexOf(open);
    var subset = src.slice(start);
    var stop = subset.indexOf(close);
    var comment = null;
    var after = null;
    if (start > 0) {
        tokens.push(src.slice(0, start));
    }
    if (stop == -1) {
        comment = src.slice(start+open.length);
    }
    else {
        comment = subset.slice(open.length, stop);
        after = subset.slice(stop+close.length);
    }
    if (comment) {
        tokens.push(new please.gl.ast.Comment(comment, close === "*/"));
    }
    if (after && after.length > 0) {
        tokens = tokens.concat(please.gl.__find_comments(after));
    }
    return tokens;
};



// delimiting symbols used for splitting arbitrary strings into token
// arrays
please.gl.__symbols = [
    "(", ")", "{", "}", "[", "]",
    "+=", "-=", "*=", "/=",
    "+", "-", "*", "/",
    "==", "&&", "<=", ">=", "<<", ">>", "||",
    "<", ">", "=", "&",
    ",", ";",
];



// take a string like "foo = bar + baz;" and split it into an array of
// tokens like ["foo", "=", "bar", "+", "baz", ";"]
please.gl.__split_tokens = function (text) {
    var lowest_symbol = null;
    var lowest_offset = Infinity;

    ITER(i, please.gl.__symbols) {
        var symbol = please.gl.__symbols[i];
        var offset = text.indexOf(symbol);
        if (offset !== -1 && offset < lowest_offset) {
            lowest_symbol = symbol;
            lowest_offset = offset;
        }
    }

    var tokens = [];
    if (lowest_symbol) {
        if (lowest_offset > 0) {
            tokens.push(text.slice(0, lowest_offset).trim());
        }
        tokens.push(lowest_symbol);
        var after = text.slice(lowest_offset + lowest_symbol.length).trim();
        if (after.length > 0) {
            tokens = tokens.concat(please.gl.__split_tokens(after));
        }
    }
    else {
        tokens = [text];
    }
    
    return tokens;
};



// Takes the result from __split_tokens and returns a tree denoted by
// curly braces.  This also removes the 'precision' statements from
// code, to be specified elsewhere.
please.gl.__stream_to_ast = function (tokens, start) {
    DEFAULT(start, 0);
    var tree = [];

    for (var i=start; i<tokens.length; null) {
        var token = tokens[i];
        if (token === "{") {
            var sub_tree = please.gl.__stream_to_ast(tokens, i+1);
            tree.push(sub_tree[0]);
            i = sub_tree[1];
        }
        else if (token === "}") {
            if (start === 0) {
                throw("mismatched parenthesis - encountered an extra }");
            }
            else {
                return [new please.gl.ast.Block(tree), i];
            }
        }
        else {
            tree.push(token);
        }
        i+=1;
    }

    if (start === 0) {
        var extract = please.gl.__parse_globals(tree);
        var globals = extract[0];
        var remainder = please.gl.__remove_precision(extract[1]);
        var stream = globals.concat(remainder);
        return new please.gl.ast.Block(stream, "global");
    }
    else {
        throw("mismatched parenthesis - missing a }");
    }
};



// [+] please.gl.glsl_to_ast(shader_source)
//
// Takes a glsl source file and returns an abstract syntax tree
// representation of the code to be used for further processing.
//
please.gl.glsl_to_ast = function (src) {
    src = src.replace("\r", "\n");
    var tokens = [];
    var tmp = please.gl.__find_comments(src);
    ITER(i, tmp) {
        if (tmp[i].constructor === String) {
            tokens = tokens.concat(please.gl.__split_tokens(tmp[i]));
        }
        else {
            tokens.push(tmp[i]);
        }
    }
    return please.gl.__stream_to_ast(tokens);
};
