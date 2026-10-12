#!/usr/bin/env node
// Fails if package.json, plugin.xml, src/android/version.properties, and
// src/ios/WebEngagePlugin.m (WEGPluginVersion) don't all agree on the same version (P1:
// the version used to live in these 4 places independently, with no check that they matched).
'use strict';

var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');

function readPackageJsonVersion() {
  var pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return pkg.version;
}

function readPluginXmlVersion() {
  var xml = fs.readFileSync(path.join(root, 'plugin.xml'), 'utf8');
  var match = xml.match(/<plugin[^>]*\sversion="([^"]+)"/);
  if (!match) {
    throw new Error('Could not find version attribute in plugin.xml');
  }
  return match[1];
}

function readVersionPropertiesVersion() {
  var props = fs.readFileSync(path.join(root, 'src/android/version.properties'), 'utf8');
  var major = props.match(/^major=(.+)$/m);
  var minor = props.match(/^minor=(.+)$/m);
  var patch = props.match(/^patch=(.+)$/m);
  if (!major || !minor || !patch) {
    throw new Error('Could not parse src/android/version.properties');
  }
  return major[1].trim() + '.' + minor[1].trim() + '.' + patch[1].trim();
}

function readWEGPluginVersion() {
  var m = fs.readFileSync(path.join(root, 'src/ios/WebEngagePlugin.m'), 'utf8');
  var match = m.match(/#define WEGPluginVersion @"([^"]+)"/);
  if (!match) {
    throw new Error('Could not find WEGPluginVersion in src/ios/WebEngagePlugin.m');
  }
  return match[1];
}

var versions = {
  'package.json': readPackageJsonVersion(),
  'plugin.xml': readPluginXmlVersion(),
  'src/android/version.properties': readVersionPropertiesVersion(),
  'src/ios/WebEngagePlugin.m (WEGPluginVersion)': readWEGPluginVersion()
};

var sources = Object.keys(versions);
var unique = [];
sources.forEach(function (source) {
  if (unique.indexOf(versions[source]) === -1) {
    unique.push(versions[source]);
  }
});

if (unique.length > 1) {
  console.error('Version mismatch across sources:');
  sources.forEach(function (source) {
    console.error('  ' + source + ': ' + versions[source]);
  });
  process.exit(1);
}

console.log('All version sources agree: ' + unique[0]);
