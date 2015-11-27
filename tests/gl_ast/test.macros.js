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
    console.info(generated);

    var new_tree = please.gl.glsl_to_ast(tree.print());
    assert(new_tree.globals.length == 1);
    assert(new_tree.globals[0].name == '__mode_for_contrived');
    assert(new_tree.globals[0].mode == 'uniform');
    assert(new_tree.globals[0].type == 'int');
    
    assert(new_tree.methods.length == 2);
    assert(new_tree.methods[0].name == 'contrived');
    assert(new_tree.methods[0].output == 'float');
    assert(new_tree.methods[0].input.length == 1);

    assert(new_tree.methods[1].name == 'foo');
    assert(new_tree.methods[1].output == 'float');
    assert(new_tree.methods[1].input.length == 1);

    var switch_ = new_tree.methods[0].data.slice(-1)[0].data;
    assert(switch_.length > 2);
    var method = new_tree.methods[0].print();
    assert(method.indexOf('return example'));
    assert(method.indexOf('return derps * derps'));
};
