// - gl_ast/ast.hexcode.js ----------------------------------------------- //


/* [+] please.gl.ast.Hexcode(stream)
 * 
 * AST constructor function representing (parenthetical) sections.
 * 
 */
please.gl.ast.Hexcode = function (stream) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);

    if (stream[0] !== "#") {
        please.gl.ast.error(stream, "Malformed hexcode: " + stream[0]);
    }
    var hex = stream.slice(1);
    if (hex.length === 3 || hex.length === 6) {
        this.type = "vec3";
        this.value = this.parse_hex(hex);
    }
    else if (hex.length === 4 || hex.length === 8) {
        this.type = "vec4";
        this.value = this.parse_hex(hex);
    }
    else {
        this.type = null;
        please.gl.ast.error(stream, "Malformed hexcode: " + stream[0]);
    }
};


please.gl.ast.Hexcode.prototype.parse_hex = function(hex) {
    var cut = hex.length==3||hex.length==4 ? 1 : 2;
    var values = [];
    for (var i=0; i<hex.length; i+= cut) {
        var part = hex.slice(i, i+cut);
        if (cut == 1) {
            part += part;
        }
        values.push(parseInt(part, 16)/255.0);
    };
    return values;
};


please.gl.ast.Hexcode.prototype.print = function() {
    var vals = this.value.map(function (num) {
        var str = String(num);
        if (str.indexOf(".") == -1) {
            str += ".0";
        }
        return str;
    });
    return this.type + "(" + vals.join(", ") + ")";
};


// Identify hexcode symbols.
please.gl.__identify_hexcodes = function (ast) {
    var callback = function (token) {
        return new please.gl.ast.Hexcode(token);
    };
    
    var regex = /(?:#[0-9A-Fa-f]+)/m;
    var new_ast = please.gl.ast.regex_reflow(ast, regex, callback);
    return new_ast;
};