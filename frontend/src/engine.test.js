import {test} from "node:test";
import assert from "node:assert/strict";
import {evaluate, defaultCriteria} from "./engine.js";

const ws = {id:"WS-1",ram:8,cores:4,disk:120,installed:["DemoCAD"],programs:1,compatible:1};
const config = overrides => ({...defaultCriteria,...overrides});
const rule = (status, pattern="democad", weight=0) => ({status,pattern,weight,software_name:pattern,note:"test",alternative:"test"});

test("hard software blocker applies even at zero weight", () => {
  const result=evaluate(ws,config(),[rule("blocker")],[]);
  assert.equal(result.wave,"Волна 3"); assert.equal(result.score,0);
});
test("local approved exception overrides the catalog blocker", () => {
  const result=evaluate({...ws,compatible:0},config(),[rule("native_ready")],[{software_name:"DemoCAD",is_blocker:true}]);
  assert.equal(result.wave,"Волна 1");
  assert.equal(result.compatible,1);
});
test("most specific local pattern wins", () => {
  assert.equal(evaluate(ws,config(),[rule("blocker","demo"),rule("native_ready","democad")],[]).wave,"Волна 1");
});
test("manual review applies even at zero weight", () => {
  assert.equal(evaluate(ws,config(),[rule("manual_check")],[]).wave,"Волна 2");
});
test("group thresholds change the result of identical hardware", () => {
  assert.equal(evaluate(ws,config({minRam:16}),[rule("native_ready")],[]).wave,"Волна 2");
  assert.equal(evaluate(ws,config(),[rule("native_ready")],[]).wave,"Волна 1");
});
test("unknown software is reviewed above the group gap threshold", () => {
  assert.equal(evaluate(ws,config(),[],[]).wave,"Волна 2");
  assert.equal(evaluate(ws,config({maxGap:100}),[],[]).wave,"Волна 1");
});
test("empty software inventory has zero gap", () => {
  assert.equal(evaluate({...ws,installed:[]},config(),[],[]).gap,0);
});
test("zero hardware values are never replaced with optimistic defaults", () => {
  const result=evaluate({...ws,ram:0},config(),[rule("native_ready")],[]);
  assert.equal(result.wave,"Волна 2"); assert.equal(result.score,30);
});
test("hardware criterion at critical weight blocks", () => {
  const result=evaluate({...ws,ram:0},config({weights:{...defaultCriteria.weights,ram:50}}),[rule("native_ready")],[]);
  assert.equal(result.wave,"Волна 3");
});

