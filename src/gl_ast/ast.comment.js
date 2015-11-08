// - glslglsl/ast.comment.js --------------------------------------------- //


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
