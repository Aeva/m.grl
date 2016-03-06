/*
 Tests for gl_ast/ast.global.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["please.gl.__create_global"] = function () {
    var created;

    // test uniforms
    created = please.gl.__create_global(
        [please.gl.ast.str('uniform lowp float test', 10)]);
    assert(created.length == 1);
    assert(created[0].meta.offset == 10);
    assert(created[0].mode == "uniform");
    assert(created[0].type == "float");
    assert(created[0].name == "test");
    assert(created[0].size == null);
    assert(created[0].macro === null);
    assert(created[0].qualifier == "lowp");
    assert(created[0].print() == 'uniform lowp float test;\n');

    // test multiple assignment
    created = please.gl.__create_global(
        ['uniform lowp float test1', ',', 'test2']);
    assert(created.length == 2);
    assert(created[0].mode == "uniform");
    assert(created[0].type == "float");
    assert(created[0].name == "test1");
    assert(created[0].size == null);
    assert(created[0].macro === null);
    assert(created[0].qualifier == "lowp");
    assert(created[1].mode == "uniform");
    assert(created[1].type == "float");
    assert(created[1].name == "test2");
    assert(created[0].size == null);
    assert(created[1].macro === null);
    assert(created[1].qualifier == "lowp");

    // test arrays
    created = please.gl.__create_global(
        ['uniform lowp float test', '[', '32', ']']);
    assert(created.length == 1);
    assert(created[0].mode == "uniform");
    assert(created[0].type == "float");
    assert(created[0].name == "test");
    assert(created[0].size == 32);
    assert(created[0].macro === null);
    assert(created[0].qualifier == "lowp");
    assert(created[0].print() == 'uniform lowp float test[32];\n');

    // test constants
    created = please.gl.__create_global(
        ['const vec2 foo', '=', 'vec2', '(', '1.0', ',', '2.01', ')']);
    assert(created.length == 1);
    assert(created[0].mode == "const");
    assert(created[0].type == "vec2");
    assert(created[0].name == "foo")
    assert(created[0].size == null);;
    assert(created[0].value == "vec2(1.0, 2.01)");
    assert(created[0].macro == null);
    assert(created[0].qualifier == null);

    // test varyings
    created = please.gl.__create_global(
        ['varying vec3 position']);
    assert(created.length == 1);
    assert(created[0].mode == "varying");
    assert(created[0].type == "vec3");
    assert(created[0].name == "position");
    assert(created[0].size == null);
    assert(created[0].macro == null);
    assert(created[0].qualifier == null);
    assert(created[0].print() == "varying vec3 position;\n");

    // test attributes
    created = please.gl.__create_global(
        ['attribute vec2 tcoords']);
    assert(created.length == 1);
    assert(created[0].mode == "attribute");
    assert(created[0].type == "vec2");
    assert(created[0].name == "tcoords");
    assert(created[0].size == null);
    assert(created[0].macro == null);
    assert(created[0].qualifier == null);
    assert(created[0].print() == "attribute vec2 tcoords;\n");

    // test curve macro
    created = please.gl.__create_global(
        ['uniform curve float gradient', '[', '32', ']']);
    assert(created.length == 1);
    assert(created[0].mode == "uniform");
    assert(created[0].type == "float");
    assert(created[0].name == "gradient");
    assert(created[0].size == 32);
    assert(created[0].macro == "curve");
    assert(created[0].qualifier == null);
    assert(created[0].print() == "uniform float gradient[32];\n");

    // test multiple assignment for curve macros
    created = please.gl.__create_global(
        ['uniform curve float red', '[', '16', ']', ',',
         'green', '[', '32', ']', ',', 'blue', '[', '16', ']']);
    assert(created.length == 3);
    assert(created[0].mode == "uniform");
    assert(created[0].type == "float");
    assert(created[0].name == "red");
    assert(created[0].size == 16);
    assert(created[0].macro == "curve");
    assert(created[0].qualifier == null);
    assert(created[0].print() == "uniform float red[16];\n");

    assert(created[1].mode == "uniform");
    assert(created[1].type == "float");
    assert(created[1].name == "green");
    assert(created[1].size == 32);
    assert(created[1].macro == "curve");
    assert(created[1].qualifier == null);
    assert(created[1].print() == "uniform float green[32];\n");

    assert(created[2].mode == "uniform");
    assert(created[2].type == "float");
    assert(created[2].name == "blue");
    assert(created[2].size == 16);
    assert(created[2].macro == "curve");
    assert(created[2].qualifier == null);
    assert(created[2].print() == "uniform float blue[16];\n");
};


test["simple integration"] = function () {
    var src = '';
    src += 'uniform float alpha;\n';
    src += 'uniform float some_array[96];\n';
    src += 'uniform sampler2D some_texture;\n';
    src += 'varying vec3 position, normal;\n';
    src += 'attribute vec4 floob;\n';
    src += 'const int pivot = 10;\n';
    var tree = please.gl.glsl_to_ast(src);

    assert(tree.globals.length == 7);
    assert(tree.globals[0].name == "alpha");
    assert(tree.globals[1].name == "some_array");
    assert(tree.globals[1].size == 96);
    assert(tree.globals[2].name == "some_texture");
    assert(tree.globals[3].name == "position");
    assert(tree.globals[4].name == "normal");
    assert(tree.globals[5].name == "floob");
    assert(tree.globals[6].name == "pivot");
};


test["combine redundant globals"] = function () {
    var src = '';
    src += 'uniform float alpha;\n';
    src += 'uniform float alpha;\n';
    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 1);
    assert(tree.globals[0].name == "alpha");
    assert(tree.globals[0].type == "float");
    assert(tree.globals[0].mode == "uniform");
};


test["error on contradictory globals within source"] = function () {
    var src = '';
    src += 'uniform float alpha;\n';
    src += 'const float alpha;\n';

    var raised = false;
    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["error on contradictory globals after includes"] = function () {
    var src = '';
    src += 'include("normalize_screen_coord.glsl");\n';
    src += 'uniform int mgrl_buffer_width;\n';

    var raised = false;
    try {
        var tree = please.gl.glsl_to_ast(src);
        tree.print();
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["allow global variables without extra qualifiers"] = function () {
    var src = '';
    src += 'float meep;\n';
    src += 'vec2 goom;\n';
    src += 'vec3 whee;\n';

    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length === 3);
};