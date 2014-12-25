

describe("Tests for m.graph.js", function () {

    it("In which please.make_animatable is tested.", function () {
        var node = {};
        please.make_animatable(node, "foo");
        please.make_animatable(node, "bar");
        please.make_animatable(node, "baz");
        
        var count = 0;
        node.foo = function () { return count +=1; };
        node.bar = 10;
        node.baz = function () { return node.bar * -1; };

        expect(node.foo).toBe(1);
        expect(node.bar).toBe(10);
        expect(node.baz).toBe(-10);

        node.__clear_ani_cache();

        expect(node.foo).toBe(2);
        expect(node.bar).toBe(10);
        expect(node.baz).toBe(-10);
    });

    it("In which please.make_animatable_tripple is tested.", function () {
        var node_a = {};
        please.make_animatable(node_a, "location");

        node_a.location = [1,2,3];
        expect(node_a.location_y===2);
        node_a.location_z = function () { return 23; };
        expect(node_a.location_z === 3)
        expect(node_a.location_x === 1)

        node_a.location = function () { return vec3.fromValues(-1, -2, -3); };
        node_a.location_x = 43; // this should be ignored
        node_a.location_y = function () { return 55; }; // this should be ignored
        expect(node_a.location_x === -1);
        expect(node_a.location_y === -2);
        expect(node_a.location_z === -3);
        expect(node_a.location[0] === -1);
        expect(node_a.location[1] === -2);
        expect(node_a.location[2] === -3);

        node_a.location = [5, 4, 3];
        expect(node_a.location_x === 5);
        expect(node_a.location_y === 4);
        expect(node_a.location_z === 3);
        expect(node_a.location[0] === 5);
        expect(node_a.location[1] === 4);
        expect(node_a.location[2] === 3);
        
        var node_b = {};
        please.make_animatable(node_b, "location");
        expect(node_b.location == null).toBe(false);

        node_a.location = node_b;
        // node_a.location_x = 9; // ignore
        // node_a.location_y = function () { return 5; };

        node_b.location_x = function () { return 22; };
        node_b.location_y = 99;

        // expect(node_a.location_x === 5);
        // expect(node_a.location_y === 22);
        // expect(node_a.location_z === 0);
        // expect(node_a.location[0] === 5);
        // expect(node_a.location[1] === 22);
        // expect(node_a.location[2] === 0);
       
        // expect(node_b.location_x === 5);
        // expect(node_b.location_y === 22);
        // expect(node_b.location_z === 0);

        window.node_a = node_a;
        window.node_b = node_b;

        // expect(node_b.location[0] === 5);
        // expect(node_b.location[1] === 22);
        // expect(node_b.location[2] === 0);
    });

    it("In which a simple graph is constructed.", function () {
        graph = new please.SceneGraph();
        foo = new please.GraphNode();
        bar = new please.GraphNode();

        graph.add(foo);
        foo.add(bar);

        expect(graph.children.indexOf(foo)).toBe(0);
        expect(graph.children.length).toBe(1);

        expect(foo.children.indexOf(bar)).toBe(0);
        expect(foo.children.length).toBe(1);
    });

    // it("In which we test databinding.", function () {
    //     var counter = 0;
    //     graph = new please.SceneGraph();
    //     foo = new please.GraphNode();
    //     graph.add(foo);

    //     foo.x = function () {
    //         counter += 1;
    //         return counter;
    //     };

    //     graph.tick();
    //     expect(foo.__cache.xyz[0]).toBe(1);
    //     graph.tick();
    //     expect(foo.__cache.xyz[0]).toBe(2);
    //     graph.tick();
    //     expect(foo.__cache.xyz[0]).toBe(3);
    // });

    // it("In which databinding priority is tested.", function () {
    //     var counter = 0;
    //     graph = new please.SceneGraph();
    //     foo = new please.GraphNode();
    //     bar = new please.GraphNode();
    //     baz = new please.GraphNode();
    //     graph.add(foo);
    //     graph.add(bar);
    //     graph.add(baz);

    //     foo.x = 5;
    //     bar.x = function () { return foo.x - 10; };
    //     baz.x = function () { return bar.x * 2; };

    //     graph.tick();

    //     expect(foo.__cache.xyz[0]).toBe(5);
    //     expect(bar.__cache.xyz[0]).toBe(-5);
    //     expect(baz.__cache.xyz[0]).toBe(-10);
    // });

    // it("In which we test reading cached vaules of driver methods.", function () {
    //     var counter = 0;
    //     graph = new please.SceneGraph();
    //     foo = new please.GraphNode();
    //     graph.add(foo);

    //     foo.x = function () {
    //         counter += 1;
    //         return counter;
    //     };

    //     graph.tick();
    //     graph.tick();
    //     graph.tick();
    //     expect(foo.__cache.xyz[0]).toBe(3);
    // });
});