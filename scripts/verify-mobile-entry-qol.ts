import assert from 'node:assert/strict'
import { entryChanged } from '../mobile/src/lib/entry-state.ts'
import { readActivity, rememberActivity, type ActivityView } from '../mobile/src/lib/activity-memory.ts'

const tx = { amount: '', description: '', type: 'expense', category: '', date: '2026-10-31', subCategory: null, need: null, always: false, notes: '', refund: '' }
assert.equal(entryChanged(tx, {...tx}), false)
for (const [key,value] of Object.entries({ amount:'12.50',description:'Groceries',type:'income',category:'food',date:'2026-10-30',subCategory:'Cafe',need:'need',always:true,notes:'Lunch',refund:'2' })) {
  assert.equal(entryChanged(tx, {...tx,[key]:value}),true, key+' must be protected')
}
const bill={amount:'80',description:'Phone',due:'2026-11-05',repeat:'monthly',category:'utilities',subCategory:null}
for(const [key,value] of Object.entries({amount:'90',description:'Internet',due:'2026-11-06',repeat:'annual',category:'housing',subCategory:'Other'})) assert.equal(entryChanged(bill,{...bill,[key]:value}),true,key+' must be protected')
assert.equal(entryChanged(bill,{...bill}),false,'restored original values leave without a warning')

const defaults:ActivityView={preset:1,endMonth:'2026-10',category:null,query:'',offset:0}
const chosen:ActivityView={preset:3,endMonth:'2026-09',category:'food',query:'lunch',offset:850}
readActivity('a','[]',defaults); rememberActivity('a','[]',chosen)
assert.deepEqual(readActivity('a','[]',defaults),chosen,'same account and entry remembers filters and position')
const copy=readActivity('a','[]',defaults);copy.query='changed outside store'
assert.equal(readActivity('a','[]',defaults).query,'lunch','returned snapshot is independent')
assert.deepEqual(readActivity('b','[]',defaults),defaults,'another account sees no query or filters')
rememberActivity('a','[]',chosen)
assert.deepEqual(readActivity('b','[]',defaults),defaults,'late cleanup from old account cannot overwrite new visit')
readActivity('a','[]',defaults); rememberActivity('a','[]',chosen)
assert.deepEqual(readActivity('a','["housing","2026-08"]',{...defaults,category:'housing',endMonth:'2026-08'}),{...defaults,category:'housing',endMonth:'2026-08'},'explicit category/month entry wins over remembered view')
rememberActivity('a','[]',chosen)
assert.equal(readActivity('a','["housing","2026-08"]',defaults).category,'housing','old route cleanup ignored')
rememberActivity('a','["housing","2026-08"]',{...chosen,offset:NaN})
assert.equal(readActivity('a','["housing","2026-08"]',defaults).offset,0,'invalid offset cannot reach native scrolling')
readActivity(null,'[]',defaults)
assert.deepEqual(readActivity('a','[]',defaults),defaults,'signed-out read clears the cache')
console.log('Mobile entry dirty-field coverage and Activity restoration/isolation checks passed')
