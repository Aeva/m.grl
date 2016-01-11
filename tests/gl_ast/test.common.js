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



test["please.gl.ast.search"] = function () {
    var regex = /(?:#[0-9A-Fa-f]+)/m;
    var stream = please.gl.__split_tokens(
        please.gl.ast.str("foo bar #333 #444 #555 internet #666 whee", 0));
    var result = please.gl.ast.search(stream, regex);
    assert(result.length === 7);
};
