// - m.defs.js  ------------------------------------------------------------- //

/* [+]
 *
 * This part of the module implements a heap object for packing data
 * into a single binary array.
 * 
 */


//
please.Heap = function(block_size) {
    this.__block_size = block_size || 1024*512; // 512kb
    this.__blocks = [];
    this.__expand();
};


//
please.Heap.prototype.__expand = function () {
    var block = new ArrayBuffer(this.__block_size);
    block.__next = 0;
    this.__blocks.push(block);
};


//
please.Heap.prototype.request = function(array_class, length) {
    var block_index = this.__blocks.length-1;
    var block = this.__blocks[block_index];
    var request = array_class.BYTES_PER_ELEMENT * length;
    if (block.__next + request <= this.__block_size) {
        // good!
        var view = new array_class(block, block.__next, length);
        view.__ir_repr = "new " + array_class.name +
            "(this.heap.__blocks["+block_index+"], " +
            block.__next.toString() + ", " +
            length.toString() + ")";
        block.__next += request;
        return view;
    }
    else {
        if (request > this.__block_size) {
            throw new Error("Requested data exceeds heap block size!");
        }
        else {
            // reserve a new block and try again
            this.__expand();
            return this.request(array_class, length);
        }
    }
};
