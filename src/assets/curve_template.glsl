//  Do not call #include on curve_template.glsl in your source files.
//  Use the #curve macro instead!!!

GL_TYPE sample_curve(GL_TYPE samples[ARRAY_LEN], float alpha) {
  float pick = (ARRAY_LEN.0 - 1.0) * alpha;
  int low = int(floor(pick));
  int high = int(ceil(pick));
  float beta = fract(pick);

  GL_TYPE low_sample;
  GL_TYPE high_sample;

  // workaround because glsl does not allow for random access on arrays >:O
  for (int i=0; i<ARRAY_LEN; i+=1) {
    if (i == low) {
      low_sample = samples[i];
    }
    if (i == high) {
      high_sample = samples[i];
    }
  }
  
  return mix(low_sample, high_sample, beta);
}
