// - gl_alst/ast.block.js ------------------------------------------------ //


/* [+] please.gl.ast.Block(stream, type)
 * 
 * AST constructor function representing blocks.  For the sake of
 * simplicity, a source file's outter most scope is assumed to be an
 * implicit block.  This is denoted by the 'type' property of the
 * block being set to "global".
 * 
 */
please.gl.ast.Block = function (stream) {
    console.assert(this !== window);
    please.gl.ast.mixin(this);
    this.data = stream || [];
    this.type = null;
    this.prefix = null;
    this.inclusions = [];
};


// Prints the glsl for this block.  If this block is a function, then
// it will include the entire function definition.
please.gl.ast.Block.prototype.print = function (options) {
    var opt = {
        "is_include" : false,
    };
    if (options) {
        ITER_PROPS(key, opt) {
            if (options.hasOwnProperty(key)) {
                opt[key] = options[key];
            }
        }
    }

    var flat = "";
    var out = "";
    
    if (this.type === "global") {
        if (opt.is_include == false) {
            var imports = this.all_includes();
            ITER(i, imports) {
                var other = please.access(imports[i]);
                out += other.__ast.print({'is_include': other.uri});
            }
        }
        else {
            out += this.include_banner(opt.is_include, true);
        }
    }

    ITER(i, this.data) {
        var token = this.data[i];
        if (this.type === "global") {
            if (token.constructor != please.gl.ast.Global &&
                token.constructor != please.gl.ast.Comment &&
                token.constructor != please.gl.ast.Block) {
                continue;
            }
        }
        if (token.print) {
            flat += token.print();
        }
        else {
            flat += token;
            if (token == ";") {
                flat += "\n";
            }
        }
    };

    if (this.type !== "global") {
        var indented = "";
        var lines = flat.split("\n");
        ITER(i, lines) {
            var line = lines[i];
            if (line.trim() !== "") {
                indented += "  " + line + "\n";
            }
        };
        out += (this.prefix || "") + " {\n" + indented + "}\n";
    }
    else {
        out += flat;
        if (opt.is_include) {
            out += this.include_banner(opt.is_include, false);
        }
    }

    return out;
};


//
please.gl.ast.Block.prototype.include_banner = function (uri, begin) {
    var main_line = begin ? " START" : " END";
    main_line += " OF INCLUDED FILE: " + uri + " ";
    var start_a = " ---==##";
    var start_b = "       ";
    var end_a = "##==---";
    var end_b = "";
    var bar = "#";
    for (var i=0; i<main_line.length; i+=1) {
        bar += "=";
    }
    bar += "#"
    var out = "";
    out += "\n";
    out += "//" + start_b + bar + end_b + "\n";
    out += "//" + start_a + main_line + end_a + "\n";
    out += "//" + start_b + bar + end_b + "\n\n";
    return out
};


// Returns all of the child ast objects for this block.
please.gl.ast.Block.prototype.children = function () {
    return this.data;
};


// Put together a list of files to be included.
please.gl.ast.Block.prototype.all_includes = function (skip) {
    var others = [];
    ITER(i, this.inclusions) {
        var uri = this.inclusions[i];
        var another = please.access(uri, null);
        if (another === null) {
            console.error("Unable to include shader: " + uri);
            continue;
        }
        others.push(uri);
    }
    return others;
};


// Make this block a function.  The "prefix" argument is a list of ast
// symbols that precede the function and are probably a function
// definition.  Currently, this would be something like ['void main',
// Parenthetical], though it is likely to change in the future, so
// take this with a grain of salt.
please.gl.ast.Block.prototype.make_function = function (invocation) {
    this.type = "function";
    this.meta = invocation[0].meta;

    var prefix = invocation[0].split(" ");
    var params = invocation[1];

    if (params.constructor !== please.gl.ast.Parenthetical) {
        throw("Malformed function invocation: " + invocation);
    }
    else if (!params.is_flat) {
        throw("Nested parenthesis in function declaration: " + invocation);
    }
    
    this.name = prefix[1]; // the name of the function
    this.input = []; // arguments eg [['float', 'foo'], ['float', 'bar']]
    this.output = prefix[0]; // return type eg 'float'

    var arg_parts = please.gl.__trim(params.data.join("").split(","));
    if (!(arg_parts.length == 1 && arg_parts[0] == "void")) {
        ITER(i, arg_parts) {
            this.input.push(arg_parts[i].split(" "));
        };
    }

    Object.defineProperty(this, "prefix", {
        get: function () {
            var prefix = this.output + " " + this.name + "(";
            var parts = [];
            ITER(i, this.input) {
                parts.push(this.input[i][0] + " " + this.input[i][1]);
            }
            prefix += parts.join(", ") + ")";
            return prefix;
        },
    });

    Object.defineProperty(this, "signature", {
        get: function () {
            var sig = this.output;
            ITER(i, this.input) {
                sig += ":" + this.input[i][0];
            }
            return sig;
        },
    });
};


// Make this block represent the global scope.
please.gl.ast.Block.prototype.make_global_scope = function () {
    this.type = "global";
    this.globals = [];
    this.methods = [];
    ITER(i, this.data) {
        var item = this.data[i];
        if (item.constructor == please.gl.ast.Global) {
            this.globals.push(item);
        }
        if (item.constructor == please.gl.ast.Block && item.type == "function") {
            this.methods.push(item);
        }
    }
    please.gl.__bind_invocations(this.data, this.methods);
};


// Identify which blocks are functions, and collapse the preceding
// statement into the method.
please.gl.__identify_functions = function (ast) {
    var cache = [];
    var remainder = [];
    var recording_for = null;

    var non_blocks = [
        "enum",
        "for",
        "if",
        "else",
    ];

    var collapse = function (block, cache) {
        recording_for = null;

        var is_block = true;
        ITER(i, non_blocks) {
            if (cache[0].startsWith(non_blocks[i])) {
                is_block = false;
                break;
            }
        }
        if (is_block) {
            block.make_function(cache);
        }
    };
    DECR(i, ast) {
        var statement = ast[i];
        if (statement.constructor == please.gl.ast.Comment) {
            remainder.unshift(statement);
            continue;
        }
        else if (statement.constructor == please.gl.ast.Block) {
            if (recording_for !== null) {
                collapse(recording_for, cache);
            }
            remainder.unshift(statement);
            recording_for = statement;
            cache = [];
            continue;
        }
        else if (recording_for !== null) {
            if (statement.constructor == String || statement.constructor == please.gl.ast.Parenthetical) {
                if (statement == ";") {
                    collapse(recording_for, cache);
                }
                else {
                    cache.unshift(statement);
                }
            }
            else {
                collapse(recording_for, cache);
                remainder.unshift(statement);
            }
        }
        else {
            remainder.unshift(statement);
        }
    }
    if (recording_for && cache.length > 0) {
        collapse(recording_for, cache);
    }
    return remainder;
};
