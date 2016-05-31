/*
 Tests for m.codegen.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["codegen dynamic IR integration"] = function () {
    var cache = {};
    cache.test_result = 0;
    cache.test_method = function (a, b) {
        this.test_result = a + b;
    };

    var ir = new please.JSIR("this.test_method", '@', 1, '@', 2);
    var src = ir.compile(cache);
    assert(ir.dirty === false);

    var expected = 'this.test_method(this["';
    expected += ir.params[0].id + '"], ';
    expected += 'this["' + ir.params[1].id + '"]);';
    assert(src === expected);
    
    var method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 3);

    ir.update_arg(0, "potato");
    assert(ir.dirty === false);
    assert(cache[ir.params[0].id] == 1);

    ir.compile(cache);
    assert(cache[ir.params[0].id] == "potato");

    method();
    assert(cache.test_result == "potato2");
};



test["codegen partial dynamic IR integration"] = function () {
    var cache = {};
    cache.test_result = 0;
    cache.test_method = function (a, b) {
        this.test_result = a + b;
    };

    var ir = new please.JSIR("this.test_method", 1, '@', 2);
    var src = ir.compile(cache);
    assert(ir.dirty === false);

    var expected = 'this.test_method(1, ';
    expected += 'this["' + ir.params[1].id + '"]);';
    assert(src === expected);
    
    var method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 3);
};



test["codegen static IR integration"] = function () {
    var cache = {};
    cache.test_result = 0;
    cache.test_method = function (a, b) {
        this.test_result = a + b;
    };

    var ir = new please.JSIR("this.test_method", 1, 2);
    var src = ir.compile(cache);
    assert(ir.dirty === false);

    var expected = 'this.test_method(1, 2);';
    assert(src === expected);
    
    var method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 3);

    ir.update_arg(0, 3);
    assert(ir.dirty === true);
    assert(cache[ir.params[0].id] == undefined);

    src = ir.compile(cache);
    assert(ir.dirty === false);
    assert(cache[ir.params[0].id] == 3);
    assert(cache.test_result === 3); // unchanged

    method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 5);
};



test["drawable ir lists"] = function () {
    var prog = please.glsl("default", "simple.vert", "diffuse.frag");
    //prog.activate();
    var defaults = {};
    var node = null;
    var ir = please.__drawable_ir(prog, null, null, null, null, defaults, node);
    var cache = {};
    var src = please.__compile_ir(ir, cache);
    console.info(src);
};
