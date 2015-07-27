/*
  M.grl uses macros in its sources that, when compiled into actual
  javascript, are no longer visible, but may leave some unusual
  structures.
 */

#define ITER(i, list) for (var i=0; i<list.length; i+=1)
#define ITER_PROPS(p, obj) for (var p in obj) if (obj.hasOwnProperty(p))
#define DECR(i, list) for (var i=list.length-1; i>=0; i-=1)
#define RANGE(i, n) for (var i=0; i<n; i+=1)
#define DEFAULT(x, value) if (x === undefined) { x = value; }
#define F(...) function (__VA_ARGS__)
#define ANI(prop, val) please.make_animatable(this, prop, val);
#define XOR(a, b) (!a ^ !b)
#define DYNAMIC(x) (typeof(x) === "function" ? x() : x)