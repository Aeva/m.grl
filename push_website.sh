#!/usr/bin/env sh

git checkout gh-pages
git merge master --no-edit
git push origin gh-pages
git checkout master

echo "done"

