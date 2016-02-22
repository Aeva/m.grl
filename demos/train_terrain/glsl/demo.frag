
precision mediump float;

uniform sampler2D diffuse_texture;

uniform float alpha;
uniform bool is_sprite;
uniform bool is_transparent;

varying vec3 local_position;
varying vec3 local_normal;
varying vec2 local_tcoords;
varying vec3 world_position;

const float lowest = -5.0;
const float highest = 50.0;

// lighting stuff
varying vec3 light_weight;



// apply ambient and diffuse lighting as calculated on the vertex
// shader to a given color value.
vec3 pdq_phong(vec3 base_color) {
  return vec3(base_color.rgb*light_weight);
}


void main(void) {
  vec4 diffuse = texture2D(diffuse_texture, local_tcoords);

  float height = clamp(world_position.z, lowest, highest);
  float scaled = (height - lowest) / distance(lowest, highest);
  
  diffuse.rgb = pdq_phong(vec3(scaled));
  
  gl_FragColor = diffuse;
}
