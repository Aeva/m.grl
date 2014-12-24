/*
  M.grl uses macros in its sources that, when compiled into actual
  javascript, are no longer visible, but may leave some unusual
  structures.
 */

#define ITER(i, list) for (var i=0; i<list.length; i+=1)
#define ITER_PROPS(p, obj) for (var p in obj) if (obj.hasOwnProperty(p))
#define DEFAULT(x, value) if (x === undefined) { x = value; }
#define F(...) function (__VA_ARGS__)
#define DRIVER(self, foo) typeof(foo) === "function" ? foo.call(self) : foo
#define ANI(prop, val) please.make_animatable(this, prop, val);
