// - glslglsl/ast.js ----------------------------------------------------- //

please.gl.ast = {};
#include "gl_ast/ast.comment.js"
#include "gl_ast/ast.global.js"
#include "gl_ast/ast.block.js"

// - glslglsl/ast.js ----------------------------------------------------- //



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



// Identify which blocks are functions, and collapse the preceding
// statement into the method.
please.gl.__identify_functions = function (ast) {
    var cache = [];
    var remainder = [];
    var recording_for = null;

    var non_blocks = [
        "enum",
        "for",
        "if",
        "else",
    ];

    var collapse = function (block, cache) {
        recording_for = null;

        var is_block = true;
        ITER(i, non_blocks) {
            if (cache[0].startsWith(non_blocks[i])) {
                is_block = false;
                break;
            }
        }
        if (is_block) {
            block.make_function(cache);
        }
    };
    DECR(i, ast) {
        var statement = ast[i];
        if (statement.constructor == please.gl.ast.Comment) {
            remainder.unshift(statement);
            continue;
        }
        else if (statement.constructor == please.gl.ast.Block) {
            if (recording_for !== null) {
                collapse(recording_for, cache);
            }
            remainder.unshift(statement);
            recording_for = statement;
            cache = [];
            continue;
        }
        else if (recording_for !== null) {
            if (statement.constructor == String) {
                if (statement == ";") {
                    collapse(recording_for, cache);
                }
                else {
                    cache.unshift(statement);
                    if (i === 0) {
                        collapse(recording_for, cache);
                    }
                }
            }
            else {
                collapse(recording_for, cache);
                remainder.unshift(statement);
            }
        }
    };
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
        var remainder = extract[1];
        remainder = please.gl.__remove_precision(remainder);
        remainder = please.gl.__identify_functions(remainder);
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
