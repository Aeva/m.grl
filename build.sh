#!/usr/bin/env sh

# build m.grl
sh jspp.sh src/m.header.js mgrl.js -DBSIDES -DWEBGL

# copy core lib into the project templates
cp mgrl.js templates/basic_project/libs/

# regenerate template archives
cd templates
rm *.zip
zip -r basic_project.zip basic_project
