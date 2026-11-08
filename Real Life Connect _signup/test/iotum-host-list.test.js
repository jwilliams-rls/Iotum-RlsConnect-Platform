const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listCompanyHosts } = require('../iotum-host-list');

test('company host inspection uses only read endpoints and returns an explicit safe field list', async () => {
  const calls=[];
  const client={async authenticate(){calls.push('authenticate');},async post(path,body){calls.push([path,body]);
    if(path==='/company/fetch')return {name:'Test company',subdomain:'test-company',hosts:[17],secret:'COMPANY_SECRET'};
    if(path==='/host/fetch_all')return [{host_id:17,name:'Test host',email:'test@example.test',role:'HOST',plan_slug:'reallife_plus',access_code:'ACCESS_SECRET',login_token_public_key:'SSO_SECRET',moderator_pin:'MOD_SECRET',meeting_url:'URL_SECRET',password_creation_link:'PASSWORD_SECRET'}];
    throw new Error('Unexpected write');}};
  const result=await listCompanyHosts(123,client);
  assert.deepEqual(calls,['authenticate',['/company/fetch',{company_id:123}],['/host/fetch_all',{company_id:123}]]);
  assert.deepEqual(result,{companyId:123,name:'Test company',subdomain:'test-company',hosts:[{HostID:17,Name:'Test host',Email:'test@example.test',Role:'HOST',Plan:'reallife_plus'}]});
  assert.doesNotMatch(JSON.stringify(result),/SECRET|access_code|login_token|password_creation/);
});
test('company host inspection rejects invalid IDs and mismatched hosts', async () => {
  let calls=0;
  const client={async authenticate(){calls++;},async post(path){return path==='/company/fetch'?{name:'Test',subdomain:'test',hosts:[17]}:[{host_id:99,name:'Other host',email:'other@example.test',role:'HOST',plan_slug:'reallife_basic'}];}};
  for(const id of [0,-1,NaN,Infinity,1.5,'123'])await assert.rejects(listCompanyHosts(id,client),/positive numeric/);
  assert.equal(calls,0);
  await assert.rejects(listCompanyHosts(123,client),/did not match/);
});
