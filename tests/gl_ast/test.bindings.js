/*
 Tests for gl_ast/ast.bindings.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["binding integration"] = function () {
    var src = '' +
        'binding_contex GraphNode {\n' +
        '  attribute vec3 position;\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n' +
        'uniform bool some_switch;\n' +
        'void main () {\n' +
        '}\n';

    var expected = '' +
        'attribute vec3 position;\n' +
        'uniform mat4 world_matrix;\n' +
        'uniform bool some_switch;';

    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 3);
    assert(tree.print().trim() == expected);
};