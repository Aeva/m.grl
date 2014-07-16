
precision mediump float;

uniform float width;
uniform float height;
uniform float time;

varying vec3 local_position;
varying vec4 adjusted_position;


float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}


void main(void) {
  float period = 32.0;

  // distance from the center of the screen
  float dist = distance(gl_FragCoord.xy, vec2(width/10.0, height/2.0));
  float cycle = mod(time, 10.0);

  // create horizontal streaks of noise:
  float divisions = 50.0;
  float stagger = sin(gl_FragCoord.y)*(width/divisions);
  float streaks = floor(((gl_FragCoord.x + stagger)/width)*divisions)/divisions;
  float random = rand(vec2(streaks/cycle, gl_FragCoord.y/height*cycle));

  float probability = dist/128.0;
  float offset = sin(gl_FragCoord.y) * 100.0;

  if (random*probability > .6) {
    discard;
  }
  else if (dist > 300.0+offset && random*probability > 0.25) {
    discard;
  }
  else if (dist > 350.0+offset && random*probability > 0.2) {
    discard;
  }
  else if (dist > 400.0+offset && random*probability > 0.15) {
    discard;
  }
  else if (dist > 450.0+offset && random*probability > 0.1) {
    discard;
  }
  else if (dist > 500.0+offset && random*probability > 0.5) {
    discard;
  }

  float depth = (clamp(adjusted_position.z/3.75, 0.0, 1.0)*-1.0+1.0)*2.0;

  float r = (local_position.x+1.0)/2.0;
  float g = (local_position.y+1.0)/2.0;
  float b = (local_position.z+1.0)/2.0;
  gl_FragColor = vec4(r*depth, g*depth, b*depth, 1.0);
}
