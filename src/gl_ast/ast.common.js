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


//
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