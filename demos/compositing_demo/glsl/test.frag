
precision mediump float;

// experiment
varying vec3 local_position;
uniform vec3 mgrl_model_local_min;
uniform vec3 mgrl_model_local_max;
uniform vec3 mgrl_model_local_size;
uniform vec3 mgrl_model_local_average;


void main(void) {
  // vec3 experiment = local_position / mgrl_model_local_size;
  // vec3 center = mgrl_model_local_average / mgrl_model_local_size;
  // float color = distance(experiment, center);
  // gl_FragColor = vec4(color, color, color, 1.0);

  vec3 shifted = local_position - mgrl_model_local_min;
  vec3 scaled = shifted / mgrl_model_local_size;
  gl_FragColor = vec4(scaled, 1.0);
}
