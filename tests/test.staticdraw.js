/*
 Tests for m.staticdraw.js.
.
 This file is dedicated to the public domain by way of CC0.
 https://creativecommons.org/publicdomain/zero/1.0/
*/



lazy_bind("sample_graph", function () {
    var root = new please.GraphNode();
    var foo = new please.GraphNode();
    var bar = new please.GraphNode();
    var nodes = [foo, bar];
    nodes.map(function (node) {
        node.__drawable = true;
        node.__buffers = {
            // these buffers are defined in test.gl.js
            "vbo" : window.sample_indexed_vbo,
            "ibo" : window.sample_ibo,
        };
        root.add(node);
    });

    bar.location_x = 10;
    return root;
});



lazy_bind("complex_graph", function () {
    var root = new please.GraphNode();

    var nodes = [
        new please.GraphNode(),
        new please.GraphNode(),
        new please.GraphNode(),
        new please.GraphNode(),
        new please.GraphNode()];
    
    nodes.map(function (node) {
        node.__drawable = true;
        node.__buffers = {
            // these buffers are defined in test.gl.js
            "vbo" : window.sample_indexed_vbo,
            "ibo" : window.sample_ibo,
        };
        node.shader.tint = new Float32Array([1.0, 1.0, 1.0]);
        root.add(node);
    });

    nodes[0].shader.diffuse_texture = "texture_a.png"
    nodes[1].shader.diffuse_texture = "texture_a.png"
    nodes[2].shader.diffuse_texture = "texture_b.png"
    nodes[3].shader.diffuse_texture = "texture_b.png"
    nodes[4].shader.diffuse_texture = "texture_b.png"

    // this is to give these two different values for the
    // billboard_mode uniform variable
    nodes[1].shader.tint = new Float32Array([0.0, 1.0, 1.0]);
    nodes[3].shader.tint = [0.0, 1.0, 1.0];
    
    return root;
});



test["static draw node: apply matrix"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var child = sample_graph.children[1];
    var mesh_data = child.mesh_data();
    var matrix = child.shader.world_matrix;
    var new_data = proto.__apply_matrix(mesh_data, matrix);

    var types = new_data.__types;
    var size = new_data.__vertex_count;

    please.prop_map(new_data, function (attr, buffer) {
        if (!attr.startsWith("__")) {
            assert(buffer.length == types[attr] * size);
            assert(buffer.indexOf(0) == -1);
        }
    });
};


    
test["static draw node: flatten graph"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var flat = proto.__flatten_graph(sample_graph);
    var keys = flat.cache_keys;
    var groups = flat.groups;
    var bindings = flat.sampler_bindings;

    assert(keys.length == 1);
    assert(keys[0] == "::");

    assert(groups["::"].length == 2);    
    groups["::"].map(function (chunk) {
        var size = chunk.data.__vertex_count;
        please.prop_map(chunk.data.__types, function (attr, type) {
            assert(chunk.data[attr].length == size * type);
            assert(chunk.data[attr].indexOf(0) == -1);
        });
    });

    assert(bindings["::"]["diffuse_texture"] === null);
};


    
test["static draw node: combine_vbos"] = function () {
    var proto = please.StaticDrawNode.prototype;
    var flat = proto.__flatten_graph(sample_graph);
    var vbo = proto.__combine_vbos(flat);

    var types = vbo.reference.type;
    var buffers = vbo.reference.data;
    var vertices = vbo.reference.size;

    please.prop_map(buffers, function(attr, buffer) {
        assert(buffer.length == types[attr] * vertices);
        assert(buffer.indexOf(0) == -1);
    });
};


    
test["static draw node: simple integration"] = function () {
    var node = new please.StaticDrawNode(sample_graph);
    var draw_fn = node.draw.toSource();
    var expected = "(function anonymous() {\n" +
        "if (!this.visible) { return; }\n" +
        "var prog = please.gl.get_program();\n" +
        "this.__static_vbo.bind();\n" +
        "prog.samplers['diffuse_texture'] = 'null';\n" +
        "gl.drawArrays(gl.TRIANGLES, 0, 12);\n" +
        "})";
    assert(draw_fn === expected);
};


    
test["static draw node: complex integration"] = function () {
    var node = new please.StaticDrawNode(complex_graph);
    var draw_fn = node.draw.toSource();
    var expected = "(function anonymous() {\n" +
        "if (!this.visible) { return; }\n" +
        "var prog = please.gl.get_program();\n" +
        "this.__static_vbo.bind();\n" +
        "prog.samplers['diffuse_texture'] = 'texture_a.png';\n" +
        "prog.vars['tint'] = new Float32Array([0, 1, 1]);\n" +
        "gl.drawArrays(gl.TRIANGLES, 0, 6);\n" +
        "prog.vars['tint'] = new Float32Array([1, 1, 1]);\n" +
        "gl.drawArrays(gl.TRIANGLES, 6, 6);\n" +
        "prog.samplers['diffuse_texture'] = 'texture_b.png';\n" +
        "gl.drawArrays(gl.TRIANGLES, 12, 6);\n" +
        "prog.vars['tint'] = [0, 1, 1];\n" +
        "gl.drawArrays(gl.TRIANGLES, 18, 6);\n" +
        "prog.vars['tint'] = new Float32Array([1, 1, 1]);\n" +
        "gl.drawArrays(gl.TRIANGLES, 24, 6);\n" +
        "})";
    assert(draw_fn === expected);
};


    
test["static draw node: dissallow instancing from another sdn"] = function () {
    var error_thrown = false;
    var meep = new please.StaticDrawNode(sample_graph);
    try {
        var rawr = new please.StaticDrawNode(meep);
    } catch (error) {
        error_thrown = true;
    }
    assert(error_thrown);
};