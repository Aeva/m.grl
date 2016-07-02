#!/usr/bin/env sh

rm -rf tmp
cp -r src tmp

# bundle assets
python regen_asset_bundle.py

# build m.grl
sh jspp.sh tmp/m.header.js mgrl.js -DBSIDES -DDOM -DWEBGL -DGLSL_ASSETS -DASSETS

# apply extra transforms
python reflow.py mgrl.js

# copy core lib into the project templates
cp mgrl.js templates/common_assets/libs/
cp theme/* templates/common_assets/libs/

# regenerate template archives
cd templates
cp common_assets/libs/* basic_project/libs/

rm *.zip
rm -rf tmp
zip -r basic_project.zip basic_project
