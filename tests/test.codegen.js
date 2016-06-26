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
 
    var expected = 'this.test_method(this["';
    expected += ir.params[0].id + '"], ';
    expected += 'this["' + ir.params[1].id + '"]);';
    assert(src === expected);
    
    var method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 3);

    ir.update_arg(0, "potato");
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

    var expected = 'this.test_method(1, 2);';
    assert(src === expected);
    
    var method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 3);

    ir.compiled = true; // simulate that a compiled event occurred
    ir.update_arg(0, 3);
    assert(cache[ir.params[0].id] == undefined);

    src = ir.compile(cache);
    assert(cache[ir.params[0].id] == 3);
    assert(cache.test_result === 3); // unchanged

    method = new Function(src).bind(cache);
    method();
    assert(cache.test_result === 5);
};



test["drawable ir lists"] = function () {
    var prog = please.glsl("default", "simple.vert", "diffuse.frag");

    var builder = new please.builder.SpriteBuilder();
    builder.add_flat(10, 10, 0, 0, 10, 10);
    var buffers = builder.build();
    var vbo = buffers.vbo;
    var ibo = buffers.ibo;

    var draw_ranges = null;

    var defaults = {};
    var node = new please.GraphNode();

    var ir = please.__drawable_ir(prog, vbo, ibo, draw_ranges, defaults, node);
    var cache = {};
    cache.prog = prog;
    var src = please.__compile_ir(ir, cache);
    console.info(src);
    var method = new Function(src).bind(cache);
    method();
};
