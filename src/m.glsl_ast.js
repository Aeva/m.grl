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


/* [+] please.gl.ast.Block()
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
// curly braces.
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
        return new please.gl.ast.Block(tree, "global");
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
