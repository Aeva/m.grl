// - m.struct.js ------------------------------------------------------------ //


// [+] please.StructArray(struct, count)
//
// A StructArray is used to simulate a C-style array of structs.  This
// is used by M.GRL's particle system to avoid cache locality problems
// and garbage collection slowdowns when tracking thousands of
// objects.
//
// You probably don't need to use this.
//
please.StructArray = function (struct, count) {
    console.assert(this !== window);
    this.count = count;
    this.struct = struct;
    this.struct.size = 0;
    ITER(i, this.struct) {
        this.struct.size += this.struct[i][1];
    }
    this.blob = new Float32Array(this.struct.size * this.count);
};


// [+] please.StructView(struct_array)
//
// Provides an efficient interface for modifying a StructArray.
//
please.StructView = function (struct_array) {
    console.assert(this !== window);
    this.__array = struct_array;
    this.__index = null;
    this.__cache = {};

    var add_handle = function (name, type, cache) {
        Object.defineProperty(this, name, {
            get : function () {
                return cache[name];
            },
            set : function (val) {
                RANGE(i, type) {
                    cache[name][i] = (typeof(val) === "number") ? val : val[i];
                }
                return cache[name];
            },
        });
    }.bind(this);

    ITER(i, this.__array.struct) {
        var name = this.__array.struct[i][0];
        var type = this.__array.struct[i][1];
        add_handle(name, type, this.__cache);
    }

    this.focus(0);
};
please.StructView.prototype = {
    "focus" : function (index) {
        if (index !== this.__index) {
            this.__index = index;
            var ptr = this.__array.struct.size * index;
            ITER(i, this.__array.struct) {
                var name = this.__array.struct[i][0];
                var type = this.__array.struct[i][1];
                this.__cache[name] = this.__array.blob.subarray(ptr, ptr+type);
                ptr += type;
            }
        }
    },
    "dub" : function (src, dest) {
        var struct_size = this.__array.struct.size;
        var index_a = struct_size * src;
        var index_b = struct_size * dest;
        var prt_a = this.__array.blob.subarray(index_a, index_a + struct_size);
        var prt_b = this.__array.blob.subarray(index_b, index_b + struct_size);
        RANGE(i, this.__array.struct.size) {
            prt_b[i] = prt_a[i];
        }
    },
};
