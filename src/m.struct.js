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
    this.__index = 0;
    this.cache = {};

    var add_handle = function (name, type, offset) {
        Object.defineProperty(this, name, {
            get : function () {
                return this.cache[name];
            },
            set : function (val) {
                for (var i=0; i<type; i+=1) {
                    this.cache[name][i] = val[i];
                }
                return this.cache[name];
            },
        });
    }.bind(this);

    var pointer = 0;
    ITER(i, this.__array.struct) {
        var name = this.__array.struct[i][0];
        var type = this.__array.struct[i][1];
        add_handle(name, type, pointer);
        pointer += type;
    }

    this.focus(this.__index);
};
please.StructView.prototype = {
    "focus" : function (index) {
        this.__index = index;
        var pointer = this.__array.struct.size * index;
        ITER(i, this.__array.struct) {
            var name = this.__array.struct[i][0];
            var type = this.__array.struct[i][1];
            this.cache[name] = this.__array.blob.subarray(pointer, pointer+type);
            pointer += type;
        }
    },
};