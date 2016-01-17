

varying float linear_depth;


swappable vec3 diffuse_color() {
  return vec3(0.0, 0.0, 0.0);
}


void main() {
  vec3 haze = vec3(1.0);
  vec3 color = diffuse_color();
  float falloff = clamp(linear_depth / 150.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(color, haze, falloff), 1.0);
}
