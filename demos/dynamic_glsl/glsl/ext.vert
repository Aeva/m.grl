
uniform float mgrl_frame_start;

include("precision_sine.glsl");

vec3 wave_at_point(float x, float y) {
  // some curves
  float falloff = 20.0;
  float dist = distance(vec2(x, y), vec2(0.0));
  float alpha = exp(-1.0 * ((dist*dist)/falloff));
  float bump = exp(-1.0 * dist*dist);
  
  // 5 and .2 are nice baselines
  float frequency = 5.0;
  float amplitude = 0.2;

  // sine function corrupts precision, so we do a modulo on the time
  // input first
  float flow = mgrl_frame_start * 1.3;
  float wave = p_sin((dist - flow) * frequency);
  float z = wave * amplitude * alpha + bump;
  return vec3(x, y, z);
}


plugin void waves (inout vec3 position, inout vec3 normal, inout vec2 tcoords) {
  vec3 a = wave_at_point(position.x,       position.y);
  vec3 b = wave_at_point(position.x + 0.1, position.y);
  vec3 c = wave_at_point(position.x,       position.y + 0.1);
  vec3 norm_a = cross(b-a, c-a);
  b = wave_at_point(position.x - 0.1, position.y);
  c = wave_at_point(position.x,       position.y - 0.1);
  vec3 norm_b = cross(b-a, c-a);

  normal = normalize((norm_a + norm_b)/2.0);
  position.z = a.z;
}
