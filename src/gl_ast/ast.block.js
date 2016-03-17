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
please.gl.ast.Block.prototype.print = function () {
    if (this.type === "global") {
        return this.__print_program();
    }

    var flat = please.gl.ast.flatten(this.data);
    var out = "";
    
    var indented = "";
    var lines = flat.split("\n");
    ITER(i, lines) {
        var line = lines[i];
        if (line.trim() !== "") {
            indented += "  " + line + "\n";
        }
    };
    out += (this.prefix || "") + " {\n" + indented + "}\n";

    return out;
};


//
please.gl.ast.Block.prototype.__print_program = function (is_include) {
    // reset 'rewrites' and 'enums' dictionaries
    this.rewrite = {};
    this.enums = {};

    var out = "";    
    var methods = [];
    var hoists = [];
    
    if (!is_include && this.inclusions.length > 0) {
        // First, combine all of the globals and hoist them to the top
        // of the generated file.
        var globals = {};
        var ext_ast = {};
        var imports = this.all_includes();

        var append_global = function(global) {
            if (globals[global.name] === undefined) {
                globals[global.name] = global;
            }
            else {
                var composite = please.gl.__check_for_contradicting_globals(
                    globals[global.name], global);
                globals[global.name] = composite;
            }
        };
        
        ITER(i, imports) {
            var other = ext_ast[imports[i]] = please.access(imports[i]).__ast;
            other.globals.map(append_global);
            ITER(m, other.methods) {
                methods.push(other.methods[m]);
            }
            ITER(h, other.hoists) {
                hoists.push(other.hoists[h]);
            }
            
        }
        this.globals.map(append_global);

        methods = methods.concat(this.methods);
        please.gl.__validate_functions(methods);
        hoists = hoists.concat(this.hoists);

        // Append the collection of globals to the output buffer.
        ITER_PROPS(name, globals) {
            out += globals[name].print();
        }

        // Generate function prototypes for all methods, validate the
        // resulting concatination, and print the to the output buffer.
        hoists = hoists.concat(methods.map(function (m) { return m.generate_hoist(); }));
        hoists = please.gl.__reduce_hoists(hoists);
        out += "\n// Generated and hoisted function prototypes follow:\n"
        ITER(h, hoists) {
            out += hoists[h].print();
        }

        // Pass globals to the curve macro and append the result.
        var curve_functions = please.gl.macros.curve(globals);
        if (curve_functions.length > 0) {
            out += this.banner("CURVE MACRO", true);
            out += curve_functions;
            out += this.banner("CURVE MACRO", false);
        }

        // Now, append the contents of each included file sans globals.
        ITER_PROPS(name, ext_ast) {
            out += this.include_banner(name, true);
            out += ext_ast[name].__print_program(true);
            out += this.include_banner(name, false);
        }
    }
    else {
        methods = methods.concat(this.methods);
        please.gl.__validate_functions(methods);
    }

    // if applicable, print out hoists
    if (this.inclusions.length==0 && !is_include) {
        hoists = hoists.concat(methods.map(function (m) { return m.generate_hoist(); }));
        hoists = please.gl.__reduce_hoists(hoists);
        out += "\n// Generated and hoisted function prototypes follow:\n"
        ITER(h, hoists) {
            out += hoists[h].print();
        }
    }
    
    if (methods.length > 0) {
        // find and print virtual globals
        var virtuals = [];
        ITER(m, methods) {
            virtuals = virtuals.concat(methods[m].dynamic_globals);
        }
        ITER(v, virtuals) {
            var global = virtuals[v];
            if (global.rewrite) {
                this.rewrite[global.name] = global.rewrite;
            }
            if (global.enum) {
                var check = global.enum;
                var name = global.rewrite || global.name;
                if (check.constructor == Array) {
                    this.enums[name] = check;
                }
                else if (check.constructor == please.gl.ast.Block) {
                    this.enums[name] = check.enumerate_plugins(methods);
                }
            }
            out += global.print();
        };
    }

    // Now, append the contents of this ast tree sans globals and
    // explicit function prototypes.
    ITER(i, this.data) {
        var token = this.data[i];
        if (token.constructor == please.gl.ast.Global) {
            var dummy_out = (this.inclusions.length>0 || is_include) ? "// " : "";
            out += dummy_out + token.print();
        }
        else if (token.constructor == please.gl.ast.FunctionPrototype) {
            out += "// " + token.print();
        }
        else if (token.constructor != please.gl.ast.Block &&
                 token.constructor != please.gl.ast.Comment &&
                 token.print) {
            continue;
        }
        else if (token.constructor == please.gl.ast.Block &&
                 token.macro == "swappable") {
            out += please.gl.macros.rewrite_swappable(token, methods);
        }
        else if (token.print) {
            out += token.print();
        }
        else {
            out += token;
            if (token == ";") {
                out += "\n";
            }
        }
    };

    return out;
};


//
please.gl.ast.Block.prototype.include_banner = function (uri, begin) {
    var header = "INCLUDED FILE: " + uri;
    return this.banner(header, begin);
}
please.gl.ast.Block.prototype.banner = function (header, begin) {
    var main_line = begin ? " START" : " END";
    main_line += " OF " + header + " ";
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
        throw new Error("Malformed function invocation: " + invocation);
    }
    else if (!params.is_flat) {
        throw new Error("Nested parenthesis in function declaration: " + invocation);
    }

    this.macro = null;
    this.dynamic_globals = [];
    if (prefix[0] == "swappable" || prefix[0] == "plugin") {
        this.macro = prefix.shift();
    }
    
    this.name = prefix[1]; // the name of the function
    this.input = []; // arguments eg [['float', 'foo'], ['float', 'bar']]
    this.output = prefix[0]; // return type eg 'float'

    if (this.macro == "swappable") {
        var handle = new please.gl.ast.Global(
            "uniform", "int",
            please.gl.__swap_handle_for_function_name(this.name),
            null, null, null, "swappable");
        handle.meta = this.meta;
        handle.enum = this;
        handle.rewrite = this.name;
        this.dynamic_globals.push(handle);
    }

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


// Generates a please.gl.ast.FunctionPrototype object for this method.
please.gl.ast.Block.prototype.generate_hoist = function () {
    if (this.type !== "function") {
        throw new Error("Attempted to generate a function prototype for non-function block");
    }
    var prefix = this.output + " " + this.name;
    var hoist = new please.gl.ast.FunctionPrototype(prefix, null);
    hoist.input = this.input;
    return hoist;
};


// Make this block represent the global scope.
please.gl.ast.Block.prototype.make_global_scope = function () {
    this.type = "global";
    this.hoists = []; // "function prototypes"
    this.globals = [];
    this.methods = [];
    this.rewrite = {};
    this.enums = {};
    ITER(i, this.data) {
        var item = this.data[i];
        if (item.constructor == please.gl.ast.Global) {
            this.globals.push(item);
        }
        if (item.constructor == please.gl.ast.Block && item.type == "function") {
            this.methods.push(item);
        }
        if (item.constructor == please.gl.ast.FunctionPrototype) {
            this.hoists.push(item);
        }
    }
    please.gl.__bind_invocations(this.data, this.methods);
};


// Used for generating enums for swappable methods.
please.gl.ast.Block.prototype.enumerate_plugins = function (method_set) {
    console.assert(this.macro == "swappable");
    var enums = [this.name];
    ITER(m, method_set) {
        var method = method_set[m];
        if (method.macro == "plugin" && method.signature == this.signature) {
            console.assert(enums.indexOf(method.name) == -1);
            enums.push(method.name);
        }
    }
    return enums;
};


// Verify that the given set of functions contain no redundant
// definitions or invalid overloads.
please.gl.__validate_functions = function (methods) {
    var groups = {};
    methods.map(function (block) {
        if (!groups[block.name]) {
            groups[block.name] = [block.signature];
            return;
        }
        var group = groups[block.name];
        if (group.indexOf(block.signature) != -1) {
            var msg = "Cannot register two functions of the same name and type " +
                "signature.";
            please.gl.ast.error(block, msg);
        }
        else if (block.macro == "swappable" || block.macro == "plugin") {
            var msg = "Cannot overload swappable/plugin functions.";
            please.gl.ast.error(block, msg);
        }
        else {
            group.push(block.signature);
        }
    });
};


// Identify which blocks are functions, and collapse the 
// statement into the method.
please.gl.__identify_functions = function (ast) {
    var cache = [];
    var remainder = [];
    var recording_for = null;

    // misnomer, just means these indicate the scanned token is not a
    // function-block
    var non_blocks = [
        "enum",
        "for",
        "if",
        "else",
        "struct",
        "binding_context",
    ];

    var collapse = function (block, cache) {
        recording_for = null;
        cache = please.gl.__trim(cache);
        
        var is_block = true;
        ITER(i, non_blocks) {
            if (cache[0].startsWith(non_blocks[i])) {
                is_block = false;
                break;
            }
        }
        if (is_block && cache.length > 1) {
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
