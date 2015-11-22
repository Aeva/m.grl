

tests.hello_world = function () {
    var some_helper = function () {
        throw new Error("some error");
    };
    some_helper();
};

tests.hello_world2 = function () {
    console.assert(false);
};

tests.hello_world3 = function () {
    throw "blind error";
};