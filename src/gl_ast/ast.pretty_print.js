// - gl_alst/ast.pretty_print.js ----------------------------------------- //


please.gl.ast.build_program = function (tree) {
    var includes = tree.all_includes();
    var gathered = [];
    ITER(u, includes) {
        var uri = includes[u];
        var asset = please.access(uri);
        if (asset) {
            gathered.push(asset.__ast);
        }
        else {
            throw new Error("Unable to import: " + uri);
        }
    }
    gathered.push(tree);

    var globals = {};
    var structs = {};
    var methods = {};
    var extensions = [];

    var out = "#version 100\n";

    ITER(g, gathered) {
        var world = gathered[g];
        // combine global variables
        world.globals.map(function (global) {
            if (globals[global.name] === undefined) {
                globals[global.name] = global;
            }
            else {
                var merged = please.gl.__check_for_contradicting_globals(
                    globals[global.name], global);
                globals[global.name] = merged;
            }
        });
        // combine struct definitions
        world.structs.map(function (struct) {
            var previous = structs[struct.name];
            if (previous) {
                please.gl.__cmp_structs(previous, struct);
            }
            else {
                structs[struct.name] = struct;
            }
        });
        // combine method definitons
        world.methods.map(function (method) {
            var key = method.name === "main" ? "main" : method.signature + ":" + method.name;
            if (methods[key]) {
                throw new Error("Redundant method definition for " + key);
            }
            methods[key] = method;
        });
        // collect extensions
        extensions = extensions.concat(world.extensions);
    }

    // write out extensions first
    ITER(e, extensions) {
        out += extensions[e].print();
    }

    // write out precision
    out += "#ifdef GL_FRAGMENT_PRECISION_HIGH\n";
    out += "precision highp float;\n";
    out += "#else\n";
    out += "precision mediump float;\n";
    out += "#endif\n";
    out += "\n\n";


    var banner = function (msg) {
        var multiline = msg.trim().indexOf("\n") > -1;
        var out = "";
        var indent = multiline ? "// " : "  ";
        var longest = 0;
        var lines = msg.trim().split("\n");
        ITER(i, lines) {
            var line = lines[i].trim();
            longest = Math.max(line.length, longest);
            out += indent + line + "\n";
        }
        if (!multiline) {
            out = "\n\n/*\n" + out;
            RANGE(i, longest + indent.length) {
                out += " ";
            }
            out += "*/\n";
        }
        return out;
    };

    // add a notice explaining that this is compiled output
    out += banner(
// ☿ quote
This code was generated from possibly multiple source files, and likely has
been lovingly rearranged by this compiler, which was written by an imperfect
human being.  If there are errors, please have patience.  Sincere apologies
are offered, should they be mine.
// ☿ endquote
    );

    // print struct definitions
    if (please.get_properties(structs).length) {
        out += banner("struct definitions");
    }
    ITER_PROPS(name, structs) {
        out += structs[name].print();
        out += "\n";
    }

    // sort globals before printing
    out += banner("global variable and constant definitions");
    var global_names = [];
    ITER_PROPS(name, globals) {
        global_names.push(name);
    }
    global_names.sort(function (lhs, rhs) {
        var lhs_is_attr = globals[lhs].mode === "attribute";
        var rhs_is_attr = globals[rhs].mode === "attribute";
        if (lhs_is_attr && globals[lhs].name === "position") {
            // an attribute named position is always sorts first
            return -1;
        }
        else if (rhs_is_attr && globals[rhs].name === "position") {
            // an attribute named position is always sorts first
            return 1;
        }
        else if (lhs_is_attr !== rhs_is_attr) {
            // attributes sort before non-attributes
            return lhs_is_attr ? -1 : 1;
        }
        // don't care
        return 0;
    });

    // print globals
    // tracker is used to trim out redundant lines
    var tracker = {};
    ITER(g, global_names) {
        var printed = globals[global_names[g]].print().trim().split("\n");
        ITER(p, printed) {
            var line = printed[p].trim();
            if (!tracker[line]) {
                tracker[line] = true;
                out += line + "\n";
            }
        }
    }

    // print hoists
    if (please.get_properties(methods).length > 1) {
        out += banner("hoisted function declarations");
        ITER_PROPS(key, methods) {
            if (key !== "main") {
                // note: oisting the main method will trip up some compilers
                out += methods[key].generate_hoist().print();
            }
        }
    }

    // print methods
    out += banner("function definitions");
    ITER_PROPS(key, methods) {
        out += methods[key].print();
        out += "\n";
    }
    
    return out;
};