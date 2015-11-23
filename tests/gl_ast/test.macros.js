/*
 Tests for gl_ast/ast.macros.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["include macro integration"] = function () {
    var src = '';
    src += 'include("normalize_screen_coord.glsl");\n';
    src += 'uniform float alpha;\n';
    src += 'void main() {\n';
    src += '  gl_FragColor = test(0.5);\n';
    src += '}\n';
    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 1);
    assert(tree.methods.length == 1);

    // run the printed output through the compiler again so we can
    // introspect it.
    var printed = please.gl.glsl_to_ast(tree.print());
    assert(printed.globals.length == 3);
    assert(printed.methods.length == 2);

    var globals = {}, methods = {};
    var populate = function (target) {
        return function (item) {
            target[item.name] = item;
        };
    };
    printed.globals.map(populate(globals));
    printed.methods.map(populate(methods));

    assert(globals['alpha']);
    assert(globals['mgrl_buffer_width']);
    assert(globals['mgrl_buffer_height']);
    assert(methods['main']);
    assert(methods['normalize_screen_coord']);
};
