// - m.gl.ast.js --------------------------------------------------------- //

// namespaces for ast constructors and macros
please.gl.ast = {};
please.gl.macros = {};


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

#include "gl_ast/ast.common.js"
#include "gl_ast/ast.comment.js"
#include "gl_ast/ast.global.js"
#include "gl_ast/ast.block.js"
#include "gl_ast/ast.hexcode.js"
#include "gl_ast/ast.parenthetical.js"
#include "gl_ast/ast.invocation.js"
#include "gl_ast/ast.function_prototype.js"
#include "gl_ast/ast.macros.js"

// - glslglsl/ast.js ----------------------------------------------------- //



// Remove leading and trailing whitespace from a list of ast objects.
please.gl.__trim = function (stream) {
    var start = 0;
    var stop = 0;
    ITER(i, stream) {
        var check = stream[i];
        if (check.constructor == String && check.trim() == '') {
            start += 1;
        }
        else {
            break;
        }
    }
    DECR(i, stream) {
        var check = stream[i];
        if (check.constructor == String && check.trim() == '') {
            stop += 1;
        }
        else {
            break;
        }
    }
    return stream.slice(start, stream.length-stop);
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
    return please.gl.__trim(remainder);
};



// take a string like "foo = bar + baz;" and split it into an array of
// tokens like ["foo", "=", "bar", "+", "baz", ";"]
please.gl.__split_tokens = function (text) {
    var lowest_symbol = null;
    var lowest_offset = Infinity;

    ITER(i, please.gl.__symbols) {
        var symbol = please.gl.__symbols[i];
        var offset = text.indexOf(symbol);
        if (offset !== -1 && offset < lowest_offset) {
            lowest_offset = offset;
            lowest_symbol = please.gl.ast.str(symbol);
            lowest_symbol.meta.offset = text.meta.offset + lowest_offset;
        }
    }

    var tokens = [];
    if (lowest_symbol) {
        if (lowest_offset > 0) {
            var raw = text.slice(0, lowest_offset);
            var pre = (/\s*/).exec(raw)[0];
            var cut = please.gl.ast.str(raw.trim(), text.meta.offset + pre.length);
            tokens.push(cut);
        }
        tokens.push(lowest_symbol);
        var raw = text.slice(lowest_offset + lowest_symbol.length);
        var pre = (/\s*/).exec(raw)[0];
        var after = please.gl.ast.str(raw.trim());
        if (after.length > 0) {
            after.meta.offset = lowest_symbol.meta.offset + lowest_symbol.length + pre.length;
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
        if (token == "{") {
            var sub_tree = please.gl.__stream_to_ast(tokens, i+1);
            sub_tree[0].meta = token.meta;
            tree.push(sub_tree[0]);
            i = sub_tree[1];
        }
        else if (token == "}") {
            if (start === 0) {
                throw new Error("Extra '}' on line " + (token.line+1));
            }
            else {
                tree = please.gl.__identify_hexcodes(tree);
                tree = please.gl.__identify_parentheticals(tree);
                tree = please.gl.__identify_invocations(tree);
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
        var globals = please.gl.__clean_globals(extract[0]);
        var remainder = extract[1];
        remainder = please.gl.__remove_precision(remainder);
        remainder = please.gl.__identify_hexcodes(remainder);
        remainder = please.gl.__identify_parentheticals(remainder);
        remainder = please.gl.__identify_functions(remainder);
        remainder = please.gl.__identify_invocations(remainder);
        remainder = please.gl.__identify_prototypes(remainder);
        var stream = globals.concat(remainder);
        var ast = new please.gl.ast.Block(stream);
        ast.make_global_scope();
        please.gl.__validate_functions(ast.methods);
        return ast;
    }
    else {
        throw new Error("Missing a '}'");
    }
};



// Maps the "offset" token param to line:char values in the original
// source file.
please.gl.__apply_source_map = function (stream, src) {
    var lines = src.split("\n");
    var offsets = [];
    var total = 0;
    ITER(i, lines) {
        offsets.push(total);
        total += (lines[i].length+1); // +1 to compensate for missing \n
    }
    var apply_src_map = function (token) {
        if (token.meta.offset !== undefined && token.meta.offset !== null) {
            ITER(i, offsets) {
                if (offsets[i] > token.meta.offset) {
                    break;
                }
            }
            var target = i-1;
            token.meta.line = target;
            token.meta.char = token.meta.offset - offsets[target];
        }
        return token;
    };
    stream.map(apply_src_map);
};



// [+] please.gl.glsl_to_ast(shader_source, uri)
//
// Takes a glsl source file and returns an abstract syntax tree
// representation of the code to be used for further processing.
// The 'uri' argument is optional, and is mainly used for error
// reporting.
//
please.gl.glsl_to_ast = function (src, uri) {
    src = src.replace("\r\n", "\n");
    src = src.replace("\r", "\n");
    src = please.gl.ast.str(src);
    src.meta.offset = 0;
    uri = uri || "<unknown file>";
    var tokens = [];
    var tmp = please.gl.__find_comments(src, uri);
    ITER(i, tmp) {
        if (tmp[i].constructor === String) {
            tokens = tokens.concat(please.gl.__split_tokens(tmp[i]));
        }
        else {
            tokens.push(tmp[i]);
        }
    }
    please.gl.__apply_source_map(tokens, src);
    var ast = please.gl.__stream_to_ast(tokens);
    please.gl.macros.include(ast);
    return ast;
};
