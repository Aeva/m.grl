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
            "vbo" : window.sample_indexed_vbo,
            "ibo" : window.sample_ibo,
        };
        root.add(node);
    });

    bar.location_x = 10;
    return root;
});
