// - glslglsl/ast.global.js ---------------------------------------------- //


/* [+] please.gl.ast.Global(text)
 * 
 * A global variable declaration.  This is used for the following
 * types of glsl global variables:
 *
 *  - uniform
 *  - varying
 *  - attribute
 *  - constant
 *
 */
please.gl.ast.Global = function (mode, type, name, value) {
    console.assert(this !== window);
    this.mode = mode;
    this.type = type;
    this.name = name;
    if (type === "const") {
        this.value = value;
    }
};
please.gl.ast.Global.prototype.print = function () {
    var out = ""
    out += this.mode + " ";
    out += this.type + " ";
    out += this.name;
    if (this.type === "const") {
        out += "=" + this.value;
    }
    out += ";\n";
    return out;
};

