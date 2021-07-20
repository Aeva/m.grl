#!/usr/bin/env sh

# bundle assets
python3 regen_asset_bundle.py

# build m.grl
sh jspp.sh src/m.header.js mgrl.js -DBSIDES -DDOM -DWEBGL -DGLSL_ASSETS -DASSETS

# copy core lib into the project templates
cp mgrl.js templates/common_assets/libs/
cp theme/* templates/common_assets/libs/

# regenerate template archives
cd templates
cp common_assets/libs/* basic_project/libs/

rm *.zip
zip -r basic_project.zip basic_project
