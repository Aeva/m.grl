/*
 Tests for m.heap.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



test["block overflow"] = function () {
    var array_class = Float32Array;
    var vec_size = 4;
    // 1 vector per block
    var test = new please.Heap(array_class.BYTES_PER_ELEMENT*vec_size);
    var a = test.request(array_class, vec_size);
    var b = test.request(array_class, vec_size);
    var c = test.request(array_class, vec_size);
    var d = test.request(array_class, vec_size);
    
    assert(test.__blocks.length === 4);
};



test["write correctness"] = function () {
    var array_class = Float32Array;
    var vec_size = 2;
    // 2 vectors per block
    var test = new please.Heap(array_class.BYTES_PER_ELEMENT*vec_size*2);
    var a = test.request(array_class, vec_size);
    var b = test.request(array_class, vec_size);
    var c = test.request(array_class, vec_size);
    var d = test.request(array_class, vec_size);
    for (var i=0; i<vec_size; i+=1) {
        a[i] = i;
        b[i] = i + vec_size;
        c[i] = i + vec_size*2;
        d[i] = i + vec_size*3;
    }
    for (var i=0; i<vec_size; i+=1) {
        assert(a[i] === i);
        assert(b[i] === i + vec_size);
        assert(c[i] === i + vec_size*2);
        assert(d[i] === i + vec_size*3);
    }
};



test["IR access"] = function () {
    var array_class = Float32Array;
    var test = new please.Heap();
    var vec4 = test.request(array_class, 4);

    var src = "return " + vec4.__ir_repr + ";\n";
    var ctx = {'heap' : test};
    var accessor = new Function(src).bind(ctx);
    found = accessor();

    for (var i=0; i<vec4.length; i+=1) {
        vec4[i] = i;
        assert(found[i] == i);
    }
};