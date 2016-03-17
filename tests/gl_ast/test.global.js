/*
 Tests for gl_ast/ast.global.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["parsing global variables"] = function () {
    var created, info;

    // test non-special globals
    info = please.gl.__identify_global(
        [please.gl.ast.str('float test', 10), ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.meta.offset == 10);
    assert(created.mode == null);
    assert(created.type == "float");
    assert(created.name == "test");
    assert(created.size == null);
    assert(created.macro === null);
    assert(created.qualifier == null);
    assert(created.print() == 'float test;\n');

    // test uniforms
    info = please.gl.__identify_global(
        ['uniform lowp float test', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "test");
    assert(created.size == null);
    assert(created.macro === null);
    assert(created.qualifier == "lowp");
    assert(created.print() == 'uniform lowp float test;\n');

    // test multiple assignment
    info = please.gl.__identify_global(
        ['uniform lowp float test1', ',', 'test2', ';'], 0);
    assert(info.length == 2);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "test1");
    assert(created.size == null);
    assert(created.macro === null);
    assert(created.qualifier == "lowp");

    created = please.gl.__create_global(info[1]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "test2");
    assert(created.size == null);
    assert(created.macro === null);
    assert(created.qualifier == "lowp");

    // test arrays
    info = please.gl.__identify_global(
        ['uniform lowp float test', '[', '32', ']', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "test");
    assert(created.size == 32);
    assert(created.macro === null);
    assert(created.qualifier == "lowp");
    assert(created.print() == 'uniform lowp float test[32];\n');

    // test constants
    info = please.gl.__identify_global(
        ['const vec2 foo', '=', 'vec2', '(', '1.0', ',', '2.01', ')', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "const");
    assert(created.type == "vec2");
    assert(created.name == "foo")
    assert(created.size == null);;
    assert(created.value == "vec2(1.0,2.01)");
    assert(created.macro == null);
    assert(created.qualifier == null);

    // test varyings
    info = please.gl.__identify_global(
        ['varying vec3 position', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "varying");
    assert(created.type == "vec3");
    assert(created.name == "position");
    assert(created.size == null);
    assert(created.macro == null);
    assert(created.qualifier == null);
    assert(created.print() == "varying vec3 position;\n");

    // test attributes
    info = please.gl.__identify_global(
        ['attribute vec2 tcoords', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "attribute");
    assert(created.type == "vec2");
    assert(created.name == "tcoords");
    assert(created.size == null);
    assert(created.macro == null);
    assert(created.qualifier == null);
    assert(created.print() == "attribute vec2 tcoords;\n");

    // test curve macro
    info = please.gl.__identify_global(
        ['uniform curve float gradient', '[', '32', ']', ';'], 0);
    assert(info.length == 1);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "gradient");
    assert(created.size == 32);
    assert(created.macro == "curve");
    assert(created.qualifier == null);
    assert(created.print() == "uniform float gradient[32];\n");

    // test multiple assignment for curve macros
    info = please.gl.__identify_global(
        ['uniform curve float red', '[', '16', ']', ',',
         'green', '[', '32', ']', ',', 'blue', '[', '16', ']', ';'], 0);
    assert(info.length == 3);
    created = please.gl.__create_global(info[0]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "red");
    assert(created.size == 16);
    assert(created.macro == "curve");
    assert(created.qualifier == null);
    assert(created.print() == "uniform float red[16];\n");

    created = please.gl.__create_global(info[1]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "green");
    assert(created.size == 32);
    assert(created.macro == "curve");
    assert(created.qualifier == null);
    assert(created.print() == "uniform float green[32];\n");

    created = please.gl.__create_global(info[2]);
    assert(created.mode == "uniform");
    assert(created.type == "float");
    assert(created.name == "blue");
    assert(created.size == 16);
    assert(created.macro == "curve");
    assert(created.qualifier == null);
    assert(created.print() == "uniform float blue[16];\n");
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
    src += 'vec2 goom = vec2(10.0, 10.0);\n';
    src += 'vec3 whee;\n';
    src += 'void main() {\n';
    src += '  meep = 10.0;\n';
    src += '}\n';

    var tree = please.gl.glsl_to_ast(src);
    var expected = '' +
        '// Generated and hoisted function prototypes follow:\n' +
        'void main();\n' +
        'float meep;\n' +
        'vec2 goom = vec2(10.0,10.0);\n' +
        'vec3 whee;\n' +
        'void main() {\n' +
        '  meep=10.0;\n' +
        '}';
    
    assert(tree.globals.length === 3);
    assert(tree.print().trim() == expected);
};


test["binding context syntax"] = function () {
    var src = '' +
        'binding_context GraphNode {\n' +
        '  attribute vec3 position;\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n' +
        'uniform bool some_switch;';

    var expected = '' +
        '// Generated and hoisted function prototypes follow:\n' +
        'attribute vec3 position;\n' +
        'uniform mat4 world_matrix;\n' +
        'uniform bool some_switch;';

    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 3);
    assert(tree.print().trim() == expected);
};


test["binding context metadata"] = function () {
    var src = '' +
        'binding_context GraphNode {\n' +
        '  // comments are ok here\n' +
        '  uniform mat4 world_matrix;\n' +
        '}';
    
    var expected = '' +
        '// Generated and hoisted function prototypes follow:\n' +
        'uniform mat4 world_matrix;\n' +
        '// comments are ok here';
    
    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 1);
    assert(tree.print().trim() == expected);
    assert(tree.globals[0].binding_ctx["GraphNode"] === true);
};


test["binding context combined metadata"] = function () {
    var src = '' +
        'uniform mat4 world_matrix;\n' +
        
        'binding_context GraphNode {\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n' +
        
        '  uniform mat4 world_matrix;';
    
    var expected = '' +
        '// Generated and hoisted function prototypes follow:\n' +
        'uniform mat4 world_matrix;';
    
    var tree = please.gl.glsl_to_ast(src);
    assert(tree.globals.length == 1);
    assert(tree.print().trim() == expected);
    assert(tree.globals[0].binding_ctx["GraphNode"] === true);
};



test["binding error reporting for bs context"] = function () {
    var src = '' +
        'binding_context blorf {\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding error reporting for extra tokens"] = function () {
    var src = '' +
        'binding_context GraphNode() {\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding error reporting for missing block"] = function () {
    var src = '' +
        'binding_context GraphNode;\n' +
        'uniform mat4 world_matrix;\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding error reporting for bs context"] = function () {
    var src = '' +
        'binding_context blorf {\n' +
        '  uniform mat4 world_matrix;\n' +
        '}\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding error reporting for invalid 'global' types"] = function () {
    var src = '' +
        'binding_context GraphNode() {\n' +
        '  const mat4 whatever;\n' +
        '}\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding error reporting for inappropriate block contents"] = function () {
    var src = '' +
        'binding_context GraphNode() {\n' +
        '  void main() {}\n' +
        '}\n';
        var raised = false;

    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["binding context for swappables"] = function () {
    var src = '' +
        'binding_context GraphNode {\n' +
        '  mode_switch some_function;\n' +
        '}\n' +
        'plugin float foo() {\n' +
        '  return 20.0;\n' +
        '}\n' +
        'swappable float some_function() {\n' +
        '  return 10.0;\n' +
        '}';

    var tree = please.gl.glsl_to_ast(src);
    tree.print();
    assert(tree.globals.length == 1);
    var global = tree.globals[0];
    assert(global.name == "_mgrl_switch_some_function");
    assert(global.rewrite == "some_function");
    assert(global.type == "int");
    assert(global.binding_ctx.GraphNode);
    // the enums prop on global ast objects might be dead code
    //assert(global.enum.length > 0);
    assert(tree.enums["some_function"].length == 2);
    assert(tree.rewrite["_mgrl_switch_some_function"] == "some_function");
};
