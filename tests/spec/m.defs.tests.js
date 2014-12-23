

describe("Tests for m.defs.js", function () {

    it("In which please.once's functionality is put to the test.", function () {
        var count = 0;
        var first = please.once(function() {count+=1;});
        first();
        first();
        expect(count).toBe(1);

        count = 0;
        var second = please.once(function() {count -= 100;});
        var event = new Event("test_event");
        window.addEventListener("test_event", second);
        window.dispatchEvent(event);
        window.dispatchEvent(event);
        expect(count).toBe(-100);
    });
});
