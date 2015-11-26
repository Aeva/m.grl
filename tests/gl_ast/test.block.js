/*
 Tests for gl_ast/ast.block.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["simple integration"] = function () {
    var src = "";
    src += "vec4 test(float value) {\n";
    src += "  return vec4(value, value, value, 1.0);\n";
    src += "}\n";
    src += "void main() {\n";
    src += "  if (true) {\n"
    src += "    gl_FragColor = test(0.5);\n";
    src += "  }\n";
    src += "}\n";
    var tree = please.gl.glsl_to_ast(src);
    
    assert(tree.methods.length === 2);
    
    assert(tree.methods[0].name == "test");
    assert(tree.methods[0].output == "vec4");
    assert(tree.methods[0].input.length == 1);
    assert(tree.methods[0].input[0][0] == "float");
    assert(tree.methods[0].input[0][1] == "value");
    assert(tree.methods[0].signature == "vec4:float");
    assert(tree.methods[0].prefix == "vec4 test(float value)");

    tree.methods[0].name = "hello";
    assert(tree.methods[0].prefix == "vec4 hello(float value)");
        
    assert(tree.methods[1].name == "main");
    assert(tree.methods[1].output == "void");
    assert(tree.methods[1].input.length == 0);
    assert(tree.methods[1].signature == "void");
};


// also covers include_banner
test["please.gl.ast.Block.prototype.banner"] = function () {
    var foo = new please.gl.ast.Block();
    var bar = "";
    bar += foo.banner("this is a test", true);
    bar += foo.banner("this is a test", false);
    bar += foo.include_banner("this is a test", true);
    bar += foo.include_banner("this is a test", false);
    bar = please.gl.ast.str(bar);
    bar.meta.offset = 0;
    var parsed = please.gl.__find_comments(bar);
    parsed.map(function (token) {
        hint("token: \"" + token + "\"");
        assert(token.constructor == please.gl.ast.Comment || token.trim().length == 0);
    });
};


test["please.gl.__identify_functions"] = function () {
    var ast = [
        "void some_method",
        new please.gl.ast.Parenthetical(["float foo"]),
        new please.gl.ast.Block(),
        "vec3 another_method",
        new please.gl.ast.Parenthetical(["float foo", ",", "int bar"]),
        new please.gl.ast.Block(),
    ];
    var remainder = please.gl.__identify_functions(ast);
    assert(remainder.length == 2);
    assert(remainder[0].constructor == please.gl.ast.Block);
    assert(remainder[0].type == "function");
    assert(remainder[0].signature == "void:float");
    assert(remainder[1].constructor == please.gl.ast.Block);
    assert(remainder[1].type == "function");
    assert(remainder[1].signature == "vec3:float:int");
};


test["error on redundant methods in file"] = function () {
    var src = '';
    src += 'void test() {}\n';
    src += 'void test() {}\n';

    var raised = false;
    try {
        var tree = please.gl.glsl_to_ast(src);
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["allow overloaded methods"] = function () {
    var src = '';
    src += 'include("normalize_screen_coord.glsl");\n';
    src += 'vec3 normalize_screen_coord(vec3 coord) {}\n';
    src += 'vec4 normalize_screen_coord(vec4 coord) {}\n';
    var tree = please.gl.glsl_to_ast(src);
    tree.print();

    // run the printed output through the compiler again so we can
    // introspect it.
    var printed = please.gl.glsl_to_ast(tree.print());
    assert(printed.methods.length == 3);
};


test["error on redundant methods after includes"] = function () {
    var src = '';
    src += 'include("normalize_screen_coord.glsl");\n';
    src += 'vec2 normalize_screen_coord(vec2 coord) {}\n';

    var raised = false;
    try {
        var tree = please.gl.glsl_to_ast(src);
        tree.print();
    } catch (err) {
        raised = true;
    };
    assert(raised);
};


test["swappable method syntax"] = function () {
    var src = '';
    src += 'swappable float alpha() { return 1.0; }\n';
    src += 'swappable vec4 diffuse() { return vec4(1.0, 1.0, 1.0, alpha()); }\n';
    src += 'plugin vec4 red() { return vec4(1.0, 0.0, 0.0, alpha()); }\n';
    src += 'plugin float half() { return 0.5; }\n';
    src += 'void main() {\n';
    src += '  return diffuse();\n';
    src += '}\n';
    var tree = please.gl.glsl_to_ast(src);
    assert(tree.methods.length == 5);
    
    var by_name = {};
    tree.methods.map(function (method) {
        by_name[method.name] = method;
    });

    assert(by_name['alpha']);
    assert(by_name['diffuse']);   
    assert(by_name['red']);
    assert(by_name['half']);
    assert(by_name['main']);

    assert(tree.enums['alpha'].length == 2);
    assert(tree.enums['alpha'][0] == 'alpha');
    assert(tree.enums['alpha'][1] == 'half');

    assert(tree.enums['diffuse'].length == 2);
    assert(tree.enums['diffuse'][0] == 'diffuse');
    assert(tree.enums['diffuse'][1] == 'red');

    assert(tree.rewrite['__mode_for_alpha'] == 'alpha');
    assert(tree.rewrite['__mode_for_diffuse'] == 'diffuse');
};


test["swappable methods cannot be overloaded"] = function () {
    var src = '';
    src += 'swappable vec4 diffuse() { return vec4(1.0, 1.0, 1.0, 1.0); }\n';
    src += 'swappable vec3 diffuse() { return vec4(1.0, 1.0, 1.0); }\n';

    var raised = false;
    try {
        var tree = please.gl.glsl_to_ast(src);
        tree.print();
    } catch (err) {
        raised = true;
    };
    assert(raised);
};
