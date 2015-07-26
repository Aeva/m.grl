

m.jta.js
========

This part of M.GRL implements the importer for JTA encoded models and
animations. The basic usage of JTA models is as follows:

.. code-block:: javascript

    var jta_scene = please.access("some_model.jta");
    var model_node = jta_scene.instance();
    your_scene_graph.add(model_node);

When called with no arguments, the ".instance" method returns a graph
node which contains all objects in the jta file, preserving inheritance.
To select a specific object (and its children) in the scene, you can
specify the name of the object like so instead:

.. code-block:: javascript

    var node = jta_scene.instance("some_named_object");




