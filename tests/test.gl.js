/*
 Tests for m.gl.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



lazy_bind("sample_indexed_vbo", function () {
    var vbo_data = {
        "position" : new Float32Array([
            1.1, 1.2, 1.3,
            2.1, 2.2, 2.3,
            3.1, 3.2, 3.3,
            4.1, 4.2, 4.3,
        ]),
        "tcoords" :  new Float32Array([
            5.1, 5.2,
            6.1, 6.2,
            7.1, 7.2,
            8.1, 8.2,
        ]),
    };
    var count = vbo_data.position.length / 3;
    return please.gl.vbo(count, vbo_data);
});


lazy_bind("sample_ibo", function () {
    var ibo_data = new Uint32Array([0, 1, 2, 1, 3, 2]);
    return please.gl.ibo(ibo_data);
});


var cast_float32 = function(num) {
    return new Float32Array([num])[0];
};



test["please.gl.vbo - reference data"] = function () {
    var ref = sample_indexed_vbo.reference;
    assert(ref.size == 4.0);
    assert(ref.type.position == 3);
    assert(ref.type.tcoords == 2);
};
