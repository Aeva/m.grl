// - m.overlays.js ---------------------------------------------------------- //


// namespace
please.overlay = {
    "__bindings" : [],
};


//
please.__create_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    if (!canvas.overlay) {
        var overlay = canvas.overlay = document.createElement("div");
        overlay.id="mgrl_overlay";
        overlay.style.zIndex = 1000;
        overlay.style.position = "absolute";
        overlay.style.pointerEvents = "none";
        overlay.style.overflow = "hidden";
        document.body.appendChild(canvas.overlay);
        please.__align_canvas_overlay();
    }
};


//
please.__align_canvas_overlay = function () {
    var canvas = please.gl.canvas;
    var overlay = canvas.overlay;
    var rect = canvas.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
};


// creates and returns a new overlay child div
please.overlay.new_element = function (id, classes) {
    var el = document.createElement("div");
    please.gl.canvas.overlay.appendChild(el);
    el.style.position = "absolute";
    if (id) {
        el.id = id;
    }
    if (classes) {
        if (typeof(classes) === "string") {
            el.className = classes;
        }
        else {
            el.className = classes.join(" ");
        }
    }

    el.__graph_node = null;
    el.bind_to_node = function (node) {
        el.__graph_node = node;
        please.overlay.__bindings.push(this);
    };
    
    return el;
};


// removes all overlay children of a given id
please.overlay.remove_element_of_id = function (id) {
    var overlay = please.gl.canvas.overlay;
    var found = document.getElementById(id);
    if (found) {
        try {
            overlay.removeChild(found);
        } catch (err) {}
    }
};


// removes all overlay children of a given class name
please.overlay.remove_element_of_class = function (class_name) {
    var overlay = please.gl.canvas.overlay;
    var found = overlay.getElementsByClassName(class_name);
    DECR(i, found) {
        overlay.removeChild(found[i]);
    }
};


//
please.pipeline.add(-1, "mgrl/overlay_sync", function () {
    var origin = new Float32Array([0, 0, 0, 1]);
    ITER(i, please.overlay.__bindings) {
        var element = please.overlay.__bindings[i];
        var node = element.__graph_node;
        var graph = node.graph_root;
        if (graph) {
            var modelview_matrix = mat4.create();
            var final_matrix = mat4.create();
            mat4.multiply(
                modelview_matrix, 
                node.shader.world_matrix,
                graph.camera.view_matrix);
            mat4.multiply(
                final_matrix,
                graph.camera.projection_matrix,
                modelview_matrix);
            var position = vec4.create();
            vec4.transformMat4(position, origin, final_matrix);
            var x = ((position[0] / position[3]) + 1) * 0.5;
            var y = ((position[1] / position[3]) + 1) * 0.5;
            element.style.left = x*100 + "%";
            element.style.top = y*100 + "%";
        }
    }
}).skip_when(function () { return please.overlay.__bindings.length === 0; });