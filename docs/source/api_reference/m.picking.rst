

m.picking.js
============

This part of the module implements the object picking functionality for
M.GRL. This allows for rudimentry 3D mouse events.

Here is an example of the most basic usage of this - assigning an event
handler to a GraphNode, so that it can receive mouse events:

.. code-block:: javascript

    var graph_root = new please.SceneGraph();
    please.picking.graph = graph_root;
    var some_critter = please.access("fancy_critter.jta").instance();
    some_critter.selectable = true;
    some_critter.on_click.connect(function (event) {
        console.info("Hi Mom!");
    });
    graph_root.add(some_critter);

It is possible to get the 3D location of the mouse click as well:

.. code-block:: javascript

    var graph_root = new please.SceneGraph();
    please.picking.graph = graph_root;
    please.picking.enable_location_info = true; // <----------
    graph_root.on_mouseup.connect(function (event) {
        var coord = event.world_location;
        if (coord) {
            console.info("Click coordinate: (" + coord.join(", ") + ")");
        }
    });

The following event handlers may be used on either selectable GraphNodes
(as defined above) or on the root graph node:

-  mousedown

-  mouseup

-  click

-  doubleclick

For more advanced uses, you can define multiple picking graphs, and
assign them as "layers". Only one layer may be active at any given
moment, but you can use an event handler to change the current layer.
This can be used to implement click-and-drag functionality.

.. code-block:: javascript

    var picking_graph_a = new please.SceneGraph();
    var picking_graph_b = new please.SceneGraph();
    please.picking.graph = [picking_graph_a, picking_graph_b];
    please.picking.current_layer = 0;

    picking_graph_a.on_mousedown.connect(function (event) {
        please.picking.current_layer = 1;
        console.info("picking layer is now 1");
    });

    picking_graph_b.on_mouseup.connect(function (event) {
        please.picking.current_layer = 0;
        console.info("picking layer is now 0");
    });

The "bezier\_pick" demo implements click-and-drag using the picking
layer API.




