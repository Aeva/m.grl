/*
 Tests for gl_ast/ast.hexcode.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["basic_hexcode_integration"] = function () {
    var src = "";
    src += "vec3 test() {\n";
    src += "  return #000;\n";
    src += "}\n";

    var tree = please.gl.glsl_to_ast(src);
    var result = tree.print();
    assert(result.indexOf("vec3(0.0, 0.0, 0.0)") !== -1);
};


test["parenthetical_hexcode_integration"] = function () {
    var src = "";
    src += "vec3 test() {\n";
    src += "  return (#000);\n";
    src += "}\n";

    var tree = please.gl.glsl_to_ast(src);
    var result = tree.print();
    assert(result.indexOf("vec3(0.0, 0.0, 0.0)") !== -1);
};


test["hexcode_parsing_tests"] = function () {
    var vec3_cases = [
        new please.gl.ast.Hexcode("#333"),
        new please.gl.ast.Hexcode("#33BBaa"),
    ];
    var vec4_cases = [
        new please.gl.ast.Hexcode("#333F"),
        new please.gl.ast.Hexcode("#112233FF"),
    ];

    vec3_cases.map(function (symbol) {
        assert(symbol.type == "vec3");
        assert(symbol.value.length == 3);
    });

    vec4_cases.map(function (symbol) {
        assert(symbol.type == "vec4");
        assert(symbol.value.length == 4);
    });
};


test["hexcode_print_tests"] = function () {
    assert(new please.gl.ast.Hexcode("#000").print() == "vec3(0.0, 0.0, 0.0)");
    assert(new please.gl.ast.Hexcode("#fff").print() == "vec3(1.0, 1.0, 1.0)");
    assert(new please.gl.ast.Hexcode("#ffffff").print() == "vec3(1.0, 1.0, 1.0)");
    assert(new please.gl.ast.Hexcode("#000f").print() == "vec4(0.0, 0.0, 0.0, 1.0)");
    assert(new please.gl.ast.Hexcode("#ff00ff00").print() == "vec4(1.0, 0.0, 1.0, 0.0)");
};