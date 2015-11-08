// - glslglsl/ast.js ----------------------------------------------------- //

// namespace for ast constructors
please.gl.ast = {};

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

#include "gl_ast/ast.comment.js"
#include "gl_ast/ast.global.js"
#include "gl_ast/ast.block.js"
#include "gl_ast/ast.parenthetical.js"

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
                throw("mismatched brace - encountered an extra '}'");
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
        var ast = new please.gl.ast.Block(stream);
        ast.make_global_scope();
        return ast;
    }
    else {
        throw("mismatched brace - missing a '}'");
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
