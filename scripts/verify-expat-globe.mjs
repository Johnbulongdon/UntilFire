import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as geo from 'd3-geo';
import * as topo from 'topojson-client';
const require=createRequire(import.meta.url);
const exports={}; let selected=0;
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/ExpatFireGlobe.tsx','utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
}).outputText,{exports,require:id=>id==='react'?{...React,useState:()=>[selected,v=>{selected=v;}],useMemo:fn=>fn()}:id==='d3-geo'?geo:id==='topojson-client'?topo:id==='@/lib/geo/land-110m.json'?{default:JSON.parse(readFileSync('lib/geo/land-110m.json','utf8'))}:require(id)});
function all(node){if(!node||typeof node!=='object')return[];return[node,...React.Children.toArray(node.props?.children).flatMap(all)];}
for(const [home,dest] of [
  [{name:'San Francisco',lng:-122.4,lat:37.8},{name:'Tokyo',lng:139.7,lat:35.7}],
  [{name:'East dateline',lng:179,lat:0},{name:'West dateline',lng:-179,lat:0}],
]){
  selected=0; const props={home,baseAge:60,cities:[{...dest,key:'city',country:'Test',age:50,delta:10}]};
  let tree=exports.default(props),nodes=all(tree);
  const paths=nodes.filter(n=>n.type==='path');
  assert.equal(paths.length,3); for(const p of paths) {assert.ok(p.props.d?.length>10);assert.doesNotMatch(p.props.d,/NaN|Infinity/);}
  assert.equal(nodes.filter(n=>n.type==='circle').length,3,'Both endpoint markers visible');
  assert.match(renderToStaticMarkup(tree),/10 years sooner/);
  nodes.filter(n=>n.type==='button')[1].props.onClick();
  tree=exports.default(props);assert.match(renderToStaticMarkup(tree),/Right where you are now/);
  assert.equal(all(tree).filter(n=>n.type==='circle').length,2,'Stay view has only home marker');
}
console.log('Globe rendering passed: land, routes, both markers, dateline crossing, and stay selection.');
