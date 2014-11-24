export NODE_MODULES="$HOME/node_modules"
export JSDOC="$NODE_MODULES/jsdoc/jsdoc.js"
export THEME="$NODE_MODULES/jsdoc-rst-template/template"
export DEST="docs/source/autogen"

echo "Regenerating automatic api documentation..."
rm -rf $DEST
sh build.sh
node $JSDOC mgrl.js --template $THEME --destination $DEST
#node $JSDOC test.js --template $THEME --destination $DEST
echo "Done!"
