/*
 Tests for gl_ast/ast.invocation.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/


test["please.gl.__identify_invocations"] = function () {
    var ast = [
        please.gl.ast.str("void some_method", 10),
        new please.gl.ast.Parenthetical(["float foo"]),
        new please.gl.ast.Block(),
        please.gl.ast.str("some_method", 20),
        new please.gl.ast.Parenthetical(["10.0"]),
    ];
    var remainder = please.gl.__identify_functions(ast);
    remainder = please.gl.__identify_invocations(remainder);
    assert(remainder.length == 2);
    assert(remainder[0].constructor == please.gl.ast.Block);
    assert(remainder[1].constructor == please.gl.ast.Invocation);
    assert(remainder[1].meta.offset == 20);
};


test["please.gl.__bind_invocations"] = function () {
    var ast = [
        please.gl.ast.str("void some_method", 10),
        new please.gl.ast.Parenthetical(["float foo"]),
        new please.gl.ast.Block(),
        please.gl.ast.str("some_method", 20),
        new please.gl.ast.Parenthetical(["10.0"]),
    ];
    var remainder = please.gl.__identify_functions(ast);
    remainder = please.gl.__identify_invocations(remainder);
    var method = remainder[0];
    var invoke = remainder[1];
    please.gl.__bind_invocations(remainder, [method]);
    method.name = "test_method";
    assert(invoke.name == method.name);
};


test["don't bind in uncertain cases"] = function () {
    var src = '';
    src += 'float test(float foo) {}\n';
    src += 'vec2 test(vec2 foo) {}\n';
    src += 'void main () {\n';
    src += '  float foo = 1.0 + test(2.0+17.7);\n';
    src += '}\n';
    var tree = please.gl.glsl_to_ast(src);
    var main = tree.methods[2];
    assert(main.name == "main");
    var invocation = main.data.find(function (token) {
        return token.constructor == please.gl.ast.Invocation;
    });
    assert(invocation.bound == false);
};
