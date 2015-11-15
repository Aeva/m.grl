// - gl_ast/ast.macros.js --------------------------------------------- //


/*
 *  This file is where non-standard extensions to GLSL should be
 *  defined.
 */


please.gl.macros.include = function (ast) {
    ITER(i, ast.data) {
        var item = ast.data[i];
        if (item.constructor == please.gl.ast.Invocation && item.name == "include") {
            var args = item.args.data;
            try {
                console.assert(item.bound == false);
                console.assert(args.length == 1);
                console.assert(args[0].constructor == please.gl.ast.Comment);
                console.assert(args[0].quotation);
            } catch (error) {
                console.warn(error);
                throw ("Malformed include statement on line " +
                       item.meta.line + " at char " + item.meta.char +
                       " in file " + item.meta.uri);
            }
            var uri = args[0].data;
            ast.inclusions.push(uri);
        }
    };
};