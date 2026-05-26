#!/bin/bash
# AGPLv3.0
# https://github.com/stashapp/CommunityScripts/blob/main/LICENSE
# builds a repository of plugins

outdir="$1"

if [ -z "$outdir" ]; then
  outdir="_site"
fi

rm -rf "$outdir"
mkdir -p "$outdir"

buildPlugin()
{
  f=$1

  dir=$(dirname "$f")
  plugin_id=$(basename "$f" .yml)

  echo "Processing $plugin_id"

  version=$(git log -n 1 --pretty=format:%h -- "$dir"/*)
  updated=$(TZ=UTC0 git log -n 1 --date="format-local:%F %T" --pretty=format:%ad -- "$dir"/*)

  zipfile=$(realpath "$outdir/$plugin_id.zip")

  # Zip files at root level — Stash creates the plugin folder on extraction
  pushd "$dir" > /dev/null
  zip -r "$zipfile" . > /dev/null
  popd > /dev/null

  name=$(grep "^name:" "$f" | head -n 1 | cut -d' ' -f2- | sed -e 's/\r//' -e 's/^"\(.*\)"$/\1/')
  description=$(grep "^description:" "$f" | head -n 1 | cut -d' ' -f2- | sed -e 's/\r//' -e 's/^"\(.*\)"$/\1/')
  ymlVersion=$(grep "^version:" "$f" | head -n 1 | cut -d' ' -f2- | sed -e 's/\r//' -e 's/^"\(.*\)"$/\1/')
  version="$ymlVersion-$version"

  dep=$(grep "^# requires:" "$f" | cut -c 12- | sed -e 's/\r//')

  echo "- id: $plugin_id
  name: $name
  metadata:
    description: $description
  version: $version
  date: $updated
  path: $plugin_id.zip
  sha256: $(sha256sum "$zipfile" | cut -d' ' -f1)" >> "$outdir"/index.yml

  if [ ! -z "$dep" ]; then
    echo "  requires:" >> "$outdir"/index.yml
    for d in ${dep//,/ }; do
      echo "  - $d" >> "$outdir"/index.yml
    done
  fi

  echo "" >> "$outdir"/index.yml
}

find ./plugins -mindepth 1 -name "*.yml" | while read file; do
  buildPlugin "$file"
done
