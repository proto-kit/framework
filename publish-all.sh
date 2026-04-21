#!/bin/bash

# Define the base directory containing your packages
PACKAGES_DIR="./packages"

# Define the exact publish order of your packages here.
# List the folder names from foundational (no dependencies)
# to feature-level (depends on the foundational packages).
ORDERED_PACKAGES=(
  "common"
  "protocol"
  "module"
  "sequencer"
  "library"
  "api"
  "sdk"
  "persistance"
  "deployment"
  "processor"
  "indexer"
  "stack"
  "cli"
)

echo "Starting monorepo publish process..."

# Iterate through the hardcoded list
for pkg in "${ORDERED_PACKAGES[@]}"; do

  # Construct the full path to the package directory
  dir="$PACKAGES_DIR/$pkg"

  echo "====================================="

  # Ensure the directory actually exists
  if [ -d "$dir" ]; then
    echo "Entering $dir..."

    # Use a subshell to navigate into the directory and run npm publish
    (cd "$dir" && npm publish)

    # Capture the exit status of the npm command
    if [ $? -eq 0 ]; then
      echo "✅ Successfully published: $pkg"
    else
      echo "❌ Failed to publish: $pkg"
      echo "Halting the script to prevent out-of-sync dependency publishing."
      exit 1
    fi

  else
    echo "⚠️  Warning: Directory $dir does not exist. Skipping."
  fi
done

echo "====================================="
echo "🎉 All packages published successfully!"
