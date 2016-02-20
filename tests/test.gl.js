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
    assert(ref.data.position.length == ref.size * 3);
    assert(ref.data.tcoords.length == ref.size * 2);

    assert(ref.type.position == 3);
    assert(ref.type.tcoords == 2);

    assert(ref.data.position[3] == cast_float32(2.1));
    assert(ref.data.position[4] == cast_float32(2.2));
    assert(ref.data.position[5] == cast_float32(2.3));
    assert(ref.data.position[6] == cast_float32(3.1));

    assert(ref.data.tcoords[0] == cast_float32(5.1));
    assert(ref.data.tcoords[1] == cast_float32(5.2));
    assert(ref.data.tcoords[2] == cast_float32(6.1));
    assert(ref.data.tcoords[3] == cast_float32(6.2));
};



test["please.gl.ibo - reference data"] = function () {
    var ref = sample_ibo.reference;
    assert(ref.data.length == 6);
    assert(ref.data[0] == 0);
    assert(ref.data[1] == 1);
    assert(ref.data[2] == 2);
    assert(ref.data[3] == 1);
    assert(ref.data[4] == 3);
    assert(ref.data[5] == 2);
};



test["please.gl.decode_buffers"] = function () {
    var data = please.gl.decode_buffers(sample_indexed_vbo, sample_ibo);
    var size = data.__vertex_count;
    assert(size == sample_ibo.reference.data.length);
    assert(data.position.length == size * 3);
    assert(data.tcoords.length == size * 2);

    // triangle 1 position
    assert(data.position[0] == cast_float32(1.1));
    assert(data.position[1] == cast_float32(1.2));
    assert(data.position[2] == cast_float32(1.3));
    //
    assert(data.position[3] == cast_float32(2.1));
    assert(data.position[4] == cast_float32(2.2));
    assert(data.position[5] == cast_float32(2.3));
    //
    assert(data.position[6] == cast_float32(3.1));
    assert(data.position[7] == cast_float32(3.2));
    assert(data.position[8] == cast_float32(3.3));

    // triangle 2 position
    assert(data.position[9] == cast_float32(2.1));
    assert(data.position[10] == cast_float32(2.2));
    assert(data.position[11] == cast_float32(2.3));
    //
    assert(data.position[12] == cast_float32(4.1));
    assert(data.position[13] == cast_float32(4.2));
    assert(data.position[14] == cast_float32(4.3));
    //
    assert(data.position[15] == cast_float32(3.1));
    assert(data.position[16] == cast_float32(3.2));
    assert(data.position[17] == cast_float32(3.3));

    
    // triange 1 tcoords
    assert(data.tcoords[0] == cast_float32(5.1));
    assert(data.tcoords[1] == cast_float32(5.2));
    //
    assert(data.tcoords[2] == cast_float32(6.1));
    assert(data.tcoords[3] == cast_float32(6.2));
    //
    assert(data.tcoords[4] == cast_float32(7.1));
    assert(data.tcoords[5] == cast_float32(7.2));


    // triange 2 tcoords
    assert(data.tcoords[6] == cast_float32(6.1));
    assert(data.tcoords[7] == cast_float32(6.2));
    //
    assert(data.tcoords[8] == cast_float32(8.1));
    assert(data.tcoords[9] == cast_float32(8.2));
    //
    assert(data.tcoords[10] == cast_float32(7.1));
    assert(data.tcoords[11] == cast_float32(7.2));
};
