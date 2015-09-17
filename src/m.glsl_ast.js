// - m.glsl_ast.js ------------------------------------------------------- //


please.gl.ast = {};


please.gl.ast.Comment = function (text, multiline) {
    this.multiline = !!multiline;
    this.data = text;
    this.print = function () {
        if (this.multiline) {
            return "/*" + this.data + "*/";
        }
        else {
            return "//" + this.data + "\n";
        }
    };
};


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


please.gl.tokenize_glsl = function (src) {
    src = src.replace("\r", "\n");
    var tokens = please.gl.__find_comments_single(src);


    return tokens;
};
