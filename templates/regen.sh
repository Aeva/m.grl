#!/usr/bin/env sh

cd ..
sh build.sh
cp mgrl.js templates/basic_project/libs/

cd templates
rm *.zip
zip -r basic_project.zip basic_project

