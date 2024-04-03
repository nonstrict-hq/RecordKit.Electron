#!/bin/bash -e

# Check arguments
VERSION_NUMBER="$1"

if [ -z "$VERSION_NUMBER" ]; then
    echo "Missing version argument: ./build.sh 0.3.4"
    exit 1
fi


# Clean up previous artifact directory
rm -r ./dist || echo "No old build to remove"

# Set version in package.json
function restore_package_json {
    npm version 0.0.0
    echo "Restored version"
}

# register the cleanup function to be called on the EXIT signal
trap restore_package_json EXIT

echo "Updating version number"
npm version $VERSION_NUMBER


# Build recordkit-electron
npm run build
contents=(*)
mkdir dist
cp -r ${contents[*]} dist
