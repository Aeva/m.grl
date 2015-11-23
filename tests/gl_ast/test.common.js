/*
 Tests for gl_ast/ast.common.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["please.gl.ast.str"] = function () {
    var foo = please.gl.ast.str("test", 100);
    assert(foo == "test");
    assert(!(foo === "test"));
    assert(foo.meta.offset === 100);
    assert(foo.meta.line === null);
    assert(foo.meta.char === null);
    assert(foo.meta.uri === "<unknown file>");
};