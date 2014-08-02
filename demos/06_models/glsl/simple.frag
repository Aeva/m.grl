
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform sampler2D texture_map;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoord;
varying vec3 world_position;
varying vec3 world_normal;
varying vec3 view_position;

// lighting stuff
uniform vec3 light_direction;
varying vec3 light_weight;
varying float directional_weight;


float random_seed(vec3 co) {
  // Handy function for producing pseudo-randomness.  Returns a value
  // between 0 and 1
  return fract(sin(dot(co, vec3(12.9898,78.233,56.123))) * 43758.5453);
}


float random() {
  // Returns a value!
  return random_seed(vec3(gl_FragCoord.x, gl_FragCoord.y, mod(time, 60.0)));
}


float invert(float val) {
  return (val-1.0)*-1.0;
}


vec4 pdq_phong(vec4 base_color) {
  return vec4(vec3(base_color.rgb*light_weight), base_color.a);
}
vec4 pdq_anti_phong(vec4 base_color) {
  // has nothing to do with phong
  return mix(vec4(0.0, 0.0, 0.0, 1.0), base_color, directional_weight);
}


void main(void) {
  vec4 color_sample = pdq_phong(texture2D(texture_map, local_tcoord));
  float rand = random();

  // stuff for specular lighting:
  // eye vector
  vec3 eye_vector = normalize(-view_position);
  vec3 reflection = reflect(-light_direction, normalize(world_normal));
  float shiny = 10.0;
  float specular_weight = pow(max(dot(reflection, eye_vector), 0.0), shiny);
  //float specular_weight = 1.0;


  /*
  vec4 weird = vec4(mix(rand, 1.0, world_normal.x),
                    mix(rand, 1.0, world_normal.y),
                    mix(rand, 1.0, world_normal.z),
                    1.0);
  */
  vec4 weird = pdq_anti_phong(vec4(rand, rand, rand, 1.0));

  float frequency = 8.0;
  float amplitude = 0.4;
  float threshold = 0.25;

  float factor = (clamp(world_position.x + sin(world_position.z*frequency)*amplitude,
                        -1.0*threshold, threshold) + threshold)/(threshold*2.0);

  vec4 mixed_color = mix(color_sample, weird, factor);
  vec4 haze = vec4(.93, .93, .93, 1.0);
  float falloff = view_position.z-5.0;
  float range = 30.0;


  vec4 specularized = mixed_color + specular_weight;
  gl_FragColor = mix(specularized, haze, clamp(falloff, 0.0, range)/range);
}
