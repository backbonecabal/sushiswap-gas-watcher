#!/bin/bash
zip -r backbone-gwei-chrome.zip . -x ".*" -x "__MACOSX" "publish.sh" "docs/" "CHANGELOG.md" "README.md"
