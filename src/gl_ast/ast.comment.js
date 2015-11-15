// - gl_ast/ast.comment.js -------------------------------------------- //


/* [+] please.gl.ast.Comment(text, multiline)
 *
 * AST constructor function representing code comments.
 *
 */
please.gl.ast.Comment = function (text, type) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.multiline = type != "single" && type != "directive";
    this.quotation = type == "quote";
    this.directive = type == "directive";
    this.data = text;
};
please.gl.ast.Comment.prototype.print = function () {
    if (this.quotation || this.multiline) {
        return "/*" + this.data + "*/";
    }
    else {
        if (this.directive) {
            return "#" + this.data + "\n";
        }
        else {
            return "//" + this.data + "\n";
        }
    }
};


// This method takes the glsl source, isolates which sections are
// commented out, and returns a list of Comment objects and strings.
// This is the very first step in producing the token stream.
please.gl.__find_comments = function (src) {
    var open_regex = /(?:\/\/|\/\*|\"|\'|#)/m;//"
    var open = open_regex.exec(src);
    if (open === null) {
        return [src];
    }
    open = open[0];
    var close;
    var type;
    if (open == "/*") {
        close = "*/";
        type = "multi";
    }
    else if (open == "//") {
        close = "\n";
        type = "single";
    }
    else if (open == "#") {
        close = "\n";
        type = "directive";
    }
    else {
        close = open;
        type = "quote";
    }
    var tokens = [];
    var start = src.indexOf(open);
    var subset = src.slice(start);
    // stop skips the first character of subset, so as not to match in
    // the wrong place for quotations.
    var stop = subset.slice(1).indexOf(close)+1;
    var comment = null;
    var after = null;
    if (start > 0) {
        var first = please.gl.ast.str(src.slice(0, start));
        first.meta.offset = src.meta.offset;
        tokens.push(first);
    }
    if (stop == -1) {
        comment = src.slice(start+open.length);
        comment.meta.offset = src.meta.offset + start;
    }
    else {
        comment = subset.slice(open.length, stop);
        after = please.gl.ast.str(subset.slice(stop+close.length));
        after.meta.offset = src.meta.offset + start + stop + close.length;
    }
    if (comment) {
        comment = new please.gl.ast.Comment(comment, type)
        comment.meta.offset = src.meta.offset + start;
        tokens.push(comment);
    }
    if (after && after.length > 0) {
        tokens = tokens.concat(please.gl.__find_comments(after));
    }
    return tokens;
};
