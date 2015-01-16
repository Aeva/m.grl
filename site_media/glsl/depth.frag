
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float depth_falloff;
uniform bool bg_fill;

varying vec4 coord;
varying float depth;
varying float origin;


void main(void) {
  //float depth = gl_FragCoord.z;

  float near = 0.0;
  float far = 0.0;
  float blur = 0.0;
  float high_edge = origin + depth;
  float low_edge = origin - depth;

  if (bg_fill) {
    near = 0.0;
    far = 1.0;
    blur = 1.0;
  }
  else if (coord.z > high_edge) {
    blur = distance(coord.z, high_edge)/depth_falloff;
    far = blur;
  }
  else if (coord.z < low_edge) {
    blur = distance(coord.z, low_edge)/depth_falloff;
    near = blur;
  }

  gl_FragColor = vec4(near, far, blur, 1.0);
}
