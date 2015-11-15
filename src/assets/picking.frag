
varying vec3 local_position;
uniform vec3 object_index;
uniform bool mgrl_select_mode;
uniform vec3 mgrl_model_local_min;
uniform vec3 mgrl_model_local_size;


void main(void) {
  if (mgrl_select_mode) {
    gl_FragColor = vec4(object_index, 1.0);
  }
  else {
    vec3 shifted = local_position - mgrl_model_local_min;
    vec3 scaled = shifted / mgrl_model_local_size;
    gl_FragColor = vec4(scaled, 1.0);
  };
}
