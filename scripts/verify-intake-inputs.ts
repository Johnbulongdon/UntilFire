import assert from 'node:assert/strict';import{convertIntakeAmount,citySearch}from'../lib/intake-inputs.ts';
assert.equal(citySearch(' London, UK  '),'london, uk');assert.equal(convertIntakeAmount('',1,.8),'');assert.equal(convertIntakeAmount('4500',1,.8),'3600');assert.equal(convertIntakeAmount('3600',.8,1),'4500');assert.equal(convertIntakeAmount('135000',1,7.8),'1053000');assert.equal(convertIntakeAmount('135000',1,1),'135000');
console.log('City search normalization and entered income/expenses/savings currency conversion passed.');
