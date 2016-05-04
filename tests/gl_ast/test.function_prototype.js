/*
 Tests for gl_ast/ast.function_prototype.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["function_prototype_integration"] = function () {
    var src = "vec3 test();\n"
    var tree = please.gl.glsl_to_ast(src);
    var result = tree.print();
    assert(result.indexOf("vec3 test();") !== -1);
};


test["prototype_hoisting"] = function () {
    var src = "";
    src += "vec3 contrived(float mag) {\n";
    src += "  return vec3(mag);\n";
    src += "}\n";
    var tree = please.gl.glsl_to_ast(src);
    var result = tree.print();
    var proto_index = result.indexOf("vec3 contrived(float);");
    var body_index = result.indexOf("vec3 contrived(float mag) {");
    assert(proto_index !== -1);
    assert(body_index !== -1);
    assert(proto_index < body_index);
};


test[""] = function () {
    var src = "";
    src += "void main() {\n";
    src += "  //...\n";
    src += "}\n";
    var tree = please.gl.glsl_to_ast(src);
    var result = tree.print();
    assert(result.indexOf("void main();") == -1);
};