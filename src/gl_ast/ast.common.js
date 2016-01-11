// - gl_alst/ast.common.js ----------------------------------------------- //


/* [+] please.gl.ast.mixin(obj)
 * 
 * Adds symbols used for tracebacks to the GLSL->GLSL compiler's ast
 * objects.
 * 
 */
please.gl.ast.mixin = function (obj) {
    if (!obj.meta) {
        obj.meta = {
            'offset': null,
            'line': null,
            'char' : null,
            'uri' : "<unknown file>",
        };
    }
};


/* [+] please.gl.ast.format_metadata(ast_item)
 * 
 * Print out a nice human-readable version of the token metadata.
 * Useful when reporting where something was defined originally.
 * 
 */
please.gl.ast.format_metadata = function (item) {
    var meta = item.meta;
    return meta.uri + ":" + meta.line + ":" + meta.char;
};


/* [+] please.gl.ast.error(token, message)
 * 
 * Raise a compile time error that can possibly be traced back to a
 * specific location in an inputted source code.  This should be
 * useful for pointing out syntax errors as well as to aid in
 * debugging the compiler.
 * 
 */
please.gl.ast.error = function (token, message) {
    var msg = 'GLSL compilation error.\n';
    if (token.meta) {
        var position = please.gl.ast.format_metadata(token);
        msg += position + ' threw the following:\n';
    }
    msg += '\n' + message;
    var error = new Error(msg);
    error.stack = error.stack.split("\n").slice(1).join("\n");
    throw(error);
};


/* [+] please.gl.ast.str(text, offset)
 * 
 * Shorthand for initiating a String object with ast an ast metadata
 * object.  Use in place of 'new String(text)'.  The second parameter
 * is optional, and if provided, sets the metadata 'offset' value as
 * well.
 * 
 */
please.gl.ast.str = function (text, offset) {
    var str = new String(text);
    please.gl.ast.mixin(str);
    if (offset !== undefined) {
        str.meta.offset = offset;
    }
    return str;
};


/* [+] please.gl.ast.flatten(stream)
 * 
 * Take a token stream and "flatten" it into it's string
 * representation.
 * 
 */
please.gl.ast.flatten = function (stream) {
    if (stream.print) {
        return stream.print();
    }
    else if (stream.constructor == String) {
        return stream;
    }
    else if (stream.constructor == Array) {
        var out = "";
        ITER(i, stream) {
            out += please.gl.ast.flatten(stream[i]);
        }
        return out;
    }
    else {
        throw new Error("unable to flatten stream");
    }
};


/* [+] please.gl.ast.regex_split(stream, regex, callback)
 * 
 * Returns a new stream of tokens, splitting apart tokens where
 * necessary, so that regex matches are their own token.
 *
 * If 'callback' is provided, the return result of the callback will
 * be inserted into the stream instead of the matched string.
 * 
 */
please.gl.ast.search = function (stream, regex, callback) {
    var new_stream = [];

    function split_token (token) {
        var found = regex.exec(token);
        if (found) {
            var target = found[0];
            var offset = token.indexOf(target);

            // meta_? refers to the new token.meta.offset values
            var meta_a = token.meta.offset;
            var meta_b = meta_a + offset;
            var meta_c = meta_b + target.length;
            
            var before = please.gl.ast.str(token.slice(0, offset), meta_a);
            var after = please.gl.ast.str(token.slice(offset+target.length), meta_c);

            var result;
            if (callback) {
                result = callback(target);
                result.meta.offset = meta_b;
            }
            else {
                result = please.gl.ast.str(target, meta_b);
            }
            
            var new_tokens = [];
            if (before.length > 0) {
                new_tokens.push(before);
            }
            new_tokens.push(result);
            new_tokens = new_tokens.concat(split_token(after));
            var out = [];
            ITER(i, new_tokens) {
                var trimmed = please.gl.__trim([new_tokens[i]]);
                if (trimmed.length > 0) {
                    out.push(trimmed);
                }
            }
            return out;
        }
        else {
            return [token];
        }
    };
    
    ITER(i, stream) {
        new_stream = new_stream.concat(split_token(stream[i]));
    }
    return new_stream;
};
