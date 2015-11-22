// - gl_ast/ast.parenthetical.js ----------------------------------------- //


/* [+] please.gl.ast.Parenthetical(stream)
 * 
 * AST constructor function representing (parenthetical) sections.
 * 
 */
 please.gl.ast.Parenthetical = function (stream, closer) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.data = stream || [];
    if (closer == ")") {
        this.type = "parenthesis";
    }
    else if (closer == "]") {
        this.type = "square";
    }
    else {
        this.type = null;
    }
};


// This will print out the parenthetical area.
please.gl.ast.Parenthetical.prototype.print = function () {
    var open, close;
    if (this.type == "parenthesis") {
        open = "(";
        close = ")";
    }
    else if (this.type == "square") {
        open = "[";
        close = "]";
    }
    else {
        throw new Error("Unknown Panthetical subtype: " + this.type);
    }
    var out = [];
    ITER(i, this.data) {
        var part = this.data[i];
        if (part.print) {
            out.push(part.print());
        }
        else if (part == ",") {
            out[out.length-1] += ",";
        }
        else {
            out.push(part);
        }
    };
    return open + out.join(" ") + close;
};


// Returns all of the child ast objects for this block.
please.gl.ast.Parenthetical.prototype.children = function () {
    return this.data;
};


// Returns true when the parenthetical block contains no
// parentheticals.
please.gl.ast.Parenthetical.prototype.is_flat = function () {
    var is_flat = true;
    ITER(i, this.data) {
        if (this.data[i].constructor == please.gl.ast.Parenthetical) {
            is_flat = false;
            break;
        }
    }
    return is_flat;
};


// Identify areas that are parenthetical, including proper nesting.
// Returns a revised ast.
please.gl.__identify_parentheticals = function (ast, start, close_target) {
    DEFAULT(start, 0);
    var new_ast = [];

    var openers = ['(', '['];
    var closers = [')', ']'];

    for (var i=start; i<ast.length; null) {
        var item = ast[i];
        var open = null;
        var close = null;
        ITER(n, openers) {
            if (item == openers[n]) {
                open = openers[n];
                close = closers[n];
            }
        }
        if (open) {
            var selection = please.gl.__identify_parentheticals(ast, i+1, close);
            selection[0].meta = item.meta;
            new_ast.push(selection[0]);
            i = selection[1];
        }
        else if (item == close_target) {
            if (start === 0) {
                throw new Error("mismatched parenthesis - encountered an extra '" + close_target + "'");
            }
            else {
                return [new please.gl.ast.Parenthetical(new_ast, close_target), i];
            }
        }
        else {
            new_ast.push(item);
        }
        i+=1;
    }

    if (start === 0) {
        return new_ast;
    }
    else {
        throw new Error("mismatched parenthesis - missing a '" + close + "'");
    }
};