import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
const require=createRequire(import.meta.url);
let states=[true],index=0;const exports={};
vm.runInNewContext(ts.transpileModule(readFileSync('app/components/RevealFlow.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>id==='react'?{...React,useEffect:()=>{},useRef:v=>({current:v}),useMemo:f=>f(),useState:v=>{const i=index++;if(!(i in states))states[i]=typeof v==='function'?v():v;return[states[i],v=>states[i]=v];}}:id==='next/dynamic'?{default:()=>()=>null}:id==='@/app/components/Logo'?{default:()=>null}:require(id)});
const props={freedomAge:52,freedomYear:2048,yearsToFire:22,planningAge:30,fireTarget:1200000,pctThere:20,savingsRatePct:20,usBaselineRate:5,fireBenchmarkRate:25,expatCities:[],formatCompact:String};
function all(n){if(!n||typeof n!=='object')return[];return[n,...React.Children.toArray(n.props?.children).flatMap(all)];}
const render=()=>{index=0;return exports.default(props);};
let intro=render();assert.equal(intro.props.reduce,false,'Device preference does not gate the requested automatic presentation');assert.equal(intro.props.playMotion,true);intro.props.onDone();
let tree=render();assert.equal(tree.props['data-motion'],'play');assert.equal(all(tree).some(n=>n.type==='button'&&n.props.children==='Play animations'),false);
const replay=all(tree).find(n=>n.type==='button'&&n.props.children==='Replay reveal');assert.ok(replay);replay.props.onClick();intro=render();assert.equal(intro.props.reduce,false);assert.equal(intro.props.playMotion,true);
console.log('Automatic reveal passed: plays on entry even with device reduced motion, no play gate, replay restarts.');
