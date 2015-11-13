// - gl_ast/ast.comment.js -------------------------------------------- //


/* [+] please.gl.ast.Comment(text, multiline)
 *
 * AST constructor function representing code comments.
 *
 */
please.gl.ast.Comment = function (text, multiline) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
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
        var first = new String(src.slice(0, start));
        please.gl.ast.mixin(first);
        first.offset = src.offset;
        tokens.push(first);
    }
    if (stop == -1) {
        comment = src.slice(start+open.length);
        comment.offset = src.offset + start;
    }
    else {
        comment = subset.slice(open.length, stop);
        after = new String(subset.slice(stop+close.length));
        please.gl.ast.mixin(after);
        after.offset = src.offset + stop+close.length;
    }
    if (comment) {
        comment = new please.gl.ast.Comment(comment, close === "*/")
        comment.offset = src.offset + start;
        tokens.push(comment);
    }
    if (after && after.length > 0) {
        tokens = tokens.concat(please.gl.__find_comments(after));
    }
    return tokens;
};
