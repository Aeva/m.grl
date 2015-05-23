// - m.builder.js -------------------------------------------------------- //

// namespace
please.builder = {};


// This is used to programatically populate drawable objects.
please.builder.SpriteBuilder = function (center, resolution) {
    DEFAULT(center, false);
    DEFAULT(resolution, 64); // pixels to gl unit
    this.__center = center;
    this.__resolution = resolution;
    this.__flats = [];
    this.__v_array = {
        "position" : [],
        "tcoords" : [],
        "normal" : [],
    };
    this.__i_array = [];
};
please.builder.SpriteBuilder.prototype = {
    // add a quad to the builder; returns the element draw range.
    "add_flat" : function (clip_x, clip_y, width, height, clip_width, clip_height, offset_x, offset_y) {
        DEFAULT(clip_x, 0);
        DEFAULT(clip_y, 0);
        DEFAULT(clip_width, width-offset_x);
        DEFAULT(clip_height, height-offset_y);
        DEFAULT(offset_x, 0);
        DEFAULT(offset_y, 0);
        var x1, y1, x2, y2;
        var tx = clip_x / width;
        var ty = clip_y / height;
        var tw = clip_width / width;
        var th = clip_height / height;
        if (this.__center) {
            x1 = clip_width / -2;
            y1 = clip_height / 2;
            x2 = x1 * -1;
            y2 = y1 * -1;
        }
        else {
            x1 = clip_width;
            y1 = 0;
            x2 = 0;
            y2 = clip_height;
        }
        x1 = (offset_x + x1) / this.__resolution;
        x2 = (offset_x + x2) / this.__resolution;
        y1 = (offset_y + y1) / this.__resolution;
        y2 = (offset_y + y2) / this.__resolution;

        var v_offset = this.__v_array.position.length/3;
        this.__v_array.position = this.__v_array.position.concat([
            x1, y1, 0,
            x2, y2, 0,
            x2, y1, 0,
            x1, y2, 0,
        ]);
        this.__v_array.tcoords = this.__v_array.tcoords.concat([
            tx+tw, 1.0-(ty+th),
            tx, 1.0-(ty),
            tx, 1.0-(ty+th),
            tx+tw, 1.0-ty,
        ]);
        this.__v_array.normal = this.__v_array.normal.concat([
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
            0, 0, 1,
        ]);
        var receipt = {
            "hint" : "flat:"+x1+","+y1+":"+x2+","+y2+":"+tx+","+ty+","+tw+","+th,
            "offset" : this.__i_array.length,
            "count" : 6,
        };
        this.__i_array = this.__i_array.concat([
            v_offset + 0,
            v_offset + 1,
            v_offset + 2,

            v_offset + 1,
            v_offset + 0,
            v_offset + 3,
        ]);
        return receipt;
    },

    // builds and returns a VBO
    "build" : function () {
        var v_count = this.__v_array.position.length / 3;
        var attr_map = {
            "position" : new Float32Array(this.__v_array.position),
            "tcoords" : new Float32Array(this.__v_array.tcoords),
            "normal" : new Float32Array(this.__v_array.normal),
        };
        return {
            "vbo" : please.gl.vbo(v_count, attr_map),
            "ibo" : please.gl.ibo(new Uint16Array(this.__i_array)),
        };
    },
};