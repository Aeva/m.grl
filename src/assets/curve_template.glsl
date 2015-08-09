//  Do not call #include on curve_template.glsl in your source files.
//  Use the #curve macro instead!!!

GL_TYPE linear_curve(GL_TYPE samples[ARRAY_LEN], float alpha) {
  float pick = (ARRAY_LEN.0 - 1.0) * alpha;
  float low = floor(pick);
  float high = ceil(pick);
  float beta = fract(pick);
  return mix(samples[low],samples[high],beta);
}
