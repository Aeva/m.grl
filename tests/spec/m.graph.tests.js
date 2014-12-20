

describe("Tests for m.graph.js", function () {

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

    it("In which we test databinding.", function () {
        var counter = 0;
        graph = new please.SceneGraph();
        foo = new please.GraphNode();
        graph.add(foo);

        foo.x = function () {
            counter += 1;
            return counter;
        };

        graph.tick();
        expect(foo.__cache.xyz[0]).toBe(1);
        graph.tick();
        expect(foo.__cache.xyz[0]).toBe(2);
        graph.tick();
        expect(foo.__cache.xyz[0]).toBe(3);
    });

    it("In which databinding priority is tested.", function () {
        var counter = 0;
        graph = new please.SceneGraph();
        foo = new please.GraphNode();
        bar = new please.GraphNode();
        baz = new please.GraphNode();
        graph.add(foo);
        graph.add(bar);
        graph.add(baz);

        foo.priority = 10; // first
        bar.priority = 30; // last
        baz.priority = 20; // middle

        driver = function () {
            counter += 1;
            return counter;
        };

        foo.x = driver;
        bar.x = driver;
        baz.x = driver;

        graph.tick();
        expect(foo.__cache.xyz[0]).toBe(1);
        expect(bar.__cache.xyz[0]).toBe(3);
        expect(baz.__cache.xyz[0]).toBe(2);
    });

    it("In which we test reading cached vaules of driver methods.", function () {
        var counter = 0;
        graph = new please.SceneGraph();
        foo = new please.GraphNode();
        graph.add(foo);

        foo.x = function () {
            counter += 1;
            return counter;
        };
        priority = 20;

        bar.x = function () {
            return foo.x * -1;
        };
        priority = 10;

        graph.tick();
        expect(bar.__cache.xyz[0]).toBe(-1);
        graph.tick();
        expect(bar.__cache.xyz[0]).toBe(-2);
        graph.tick();
        expect(bar.__cache.xyz[0]).toBe(-3);
    });
});