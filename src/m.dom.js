// Namespace for m.dom guts
please.dom = {
    "name" : "dom",
    "div" : null,
    "overlay" : null,
    "allow_picking" : false,
    "get_width" : function () {
        return please.dom.div.clientWidth;
    },
    "get_height" : function () {
        return please.dom.div.clientHeight;
    },
    "image_instance" : function (asset) {
        var node = new please.GraphNode();
        var div = please.overlay.new_element();
        div.appendChild(asset);
        div.bind_to_node(node);
        return node;
    },
    "init_graph_node" : function (node) {
        node.shader = {};
	please.make_animatable(
            node, "world_matrix", node.__world_matrix_driver, node.shader, true);
    },
    "init_camera" : function (node) {
        node.look_at = [0, 0, 0];
        node.look_at_x = 0;
        node.look_at_y = 0;
        node.look_at_z = 0;
        node.up_vector = [0, 1, 0];
        node.up_vector_x = 0;
        node.up_vector_y = 1;
        node.up_vector_z = 0;
        node.__projection_mode = "orthographic";
        node.location_z = 100.0;
        Object.freeze(node.look_at);
        Object.freeze(node.look_at_x);
        Object.freeze(node.look_at_y);
        Object.freeze(node.look_at_z);
        Object.freeze(node.up_vector);
        Object.freeze(node.up_vector_x);
        Object.freeze(node.up_vector_y);
        Object.freeze(node.up_vector_z);
        Object.freeze(node.__projection_mode);
    },
};


// [+] please.dom.set_frame(div_id)
//
// This function is used for setting the element on which overlay elements
// are placed.  Either this, or please.gl.set_context, should be the first
// M.GRL call that a program makes.  Only one of these functions may be
// called, and they may be called only once.
//
please.dom.set_frame = function (div_id) {
    if (this.div !== null) {
        throw("This library is not presently designed to work with multiple frames.");
    }
    if (please.gl.canvas !== null) {
        throw("This library is presently designed to work in 2D or 3D mode, not both.");
    }
    this.div = this.overlay = document.getElementById(div_id);
    please.renderer = this;
};
