

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

    it("In which please.mix is demonstrated.", function () {
        expect(please.mix(5.0, 10.0, 0.0)).toBe(5.0);
        expect(please.mix(5.0, 10.0, 1.0)).toBe(10.0);

        
        var mixed = please.mix([1, 10], [5, 30], 0.0);
        expect(mixed[0]).toBe(1.0);
        expect(mixed[1]).toBe(10.0);

        var mixed = please.mix([1, 10], [5, 30], 1.0);
        expect(mixed[0]).toBe(5.0);
        expect(mixed[1]).toBe(30.0);
    });

    it("In which please.uuid is verified to have output.", function () {
        var uuid = please.uuid();
        expect(typeof(uuid)).toBe("string");
    });

    it("In which please.__uuid_with_crypto is tested.", function () {
        var hash = {};
        var total = 100000;
        for (var i=0; i<total; i+=1) {
            uuid = please.__uuid_with_crypto();
            hash[uuid] = true;
        }
        expect(Object.keys(hash).length).toBe(total);
        expect(typeof(uuid)).toBe("string");
    });

    it("In which please.__uuid_with_bad_rand is tested", function () {
        var hash = {};
        var total = 100000;
        for (var i=0; i<total; i+=1) {
            var uuid = please.__uuid_with_bad_rand();
            hash[uuid] = true;
        }
        expect(Object.keys(hash).length).toBe(total);
        expect(typeof(uuid)).toBe("string");
    });
});
