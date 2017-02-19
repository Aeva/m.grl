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


test['swappable methods integration'] = function () {
    var src = '';
    src += 'swappable float contrived(float example) {\n';
    src += '  return example;\n';
    src += '}\n';
    src += 'plugin float foo(float derps) {\n';
    src += '  return derps * derps;\n';
    src += '}\n';

    var tree = please.gl.glsl_to_ast(src);
    var generated = tree.print();

    var new_tree = please.gl.glsl_to_ast(tree.print());
    assert(new_tree.globals.length == 1);
    assert(new_tree.globals[0].name == '_mgrl_switch_contrived');
    assert(new_tree.globals[0].mode == 'uniform');
    assert(new_tree.globals[0].type == 'int');
    
    assert(new_tree.methods.length == 2);
    assert(new_tree.methods[0].name == 'contrived');
    assert(new_tree.methods[0].output == 'float');
    assert(new_tree.methods[0].input.length == 1);

    assert(new_tree.methods[1].name == 'foo');
    assert(new_tree.methods[1].output == 'float');
    assert(new_tree.methods[1].input.length == 1);

    var method = new_tree.methods[0].print();
    assert(method.indexOf('return example'));
    assert(method.indexOf('return derps * derps'));
};


test['instancing switch globals'] = function () {
    var src = '';
    src += 'in/uniform vec3 vector;\n';
    src += "in/uniform mat2 two_rows;\n";
    src += "in/uniform mat3 three_rows;\n";
    src += "in/uniform mat4 four_rows;\n";
    src += "void main() {\n}\n";
        
    var tree = please.gl.glsl_to_ast(src);
    var generated = tree.print();
    assert(generated.indexOf("attribute vec3 inst_attr_vector;") != -1);
    assert(generated.indexOf("attribute vec4 inst_attr_two_rows;") != -1);
    assert(generated.indexOf("attribute vec3 inst_attr2_three_rows;") != -1);
    assert(generated.indexOf("attribute vec4 inst_attr3_four_rows;") != -1);
    var main_decl_index = generated.indexOf("void main() {");
    var boiler_index = generated.indexOf("BEGIN GENERATED CODE");
    var vec_boiler_index = generated.indexOf(
        "vector = inst_ctrl_vector ? inst_attr_vector : inst_uni_vector;");
    assert(main_decl_index > -1);
    assert(boiler_index > main_decl_index);
    assert(vec_boiler_index > boiler_index);
};