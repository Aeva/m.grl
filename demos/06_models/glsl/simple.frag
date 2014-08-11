
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform float mode;
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

  // determine the cut between -x and x axis for "weird" coloring
  float frequency = 8.0;
  float amplitude = 0.4;
  float threshold = 0.25;
  float axis;
  if (mode == 1.0) {
    axis = world_position.y;
    frequency = 1.0;
    threshold = 1.0;
    amplitude = 0.8;
  }
  else {
    axis = world_position.z;
  }
  float factor = (clamp(world_position.x + sin(axis*frequency)*amplitude,
                        -1.0*threshold, threshold) + threshold)/(threshold*2.0);

  float rand = random();
  vec4 weird;
  vec4 color_sample;
  if (mode == 1.0) {
    float dither = rand / 3.0;
    float checker_scale = 3.0;

    float wobble_x = world_position.x + sin((world_position.y+(time/5000.0))*3.0) / 2.0;
    float wobble_y = world_position.y + sin((world_position.x+(time/5000.0))*3.0) / 2.0;
    bool check_x = fract(mix(world_position.x, wobble_x, factor) / checker_scale) < 0.5;
    bool check_y = fract(mix(world_position.y, wobble_y, factor) / checker_scale) < 0.5;
    if ((check_x && check_y) || (!check_x && !check_y)) {
      color_sample = vec4(0.8, 0.8, 0.8, 1.0);
      weird = vec4(0.6, 0.4, 0.4, 1.0);
    }
    else {
      color_sample = vec4(0.37, 0.6, 0.14, 1.0);
      weird = vec4(0.3, 0.3, 0.3, 1.0);
    }
    weird = vec4(weird.r + dither, weird.g + dither, weird.b + dither, 1.0);
  }
  else {
    color_sample = pdq_phong(texture2D(texture_map, local_tcoord));
    weird = pdq_anti_phong(vec4(rand, rand, rand, 1.0));
  }

  // stuff for specular lighting:
  // eye vector
  vec3 eye_vector = normalize(-view_position);
  vec3 reflection = reflect(light_direction, normalize(world_normal));
  float shiny = 10.0;
  float specular_weight = pow(max(dot(reflection, eye_vector), 0.0), shiny);

  vec4 mixed_color = mix(color_sample, weird, factor);
  vec4 haze = vec4(.93, .93, .93, 1.0);
  float falloff = view_position.z-5.0;
  float range = 30.0;


  vec4 specularized = mixed_color + specular_weight;
  gl_FragColor = mix(specularized, haze, clamp(falloff, 0.0, range)/range);
}
