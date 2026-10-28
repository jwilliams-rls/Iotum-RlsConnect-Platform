import { test } from "node:test";
import assert from "node:assert/strict";
import { plans, features, monthlyCents, isOrganizationPackageValid } from "../src/pricing.js";

test("individual Basic has its own price, independent of organization Basic", () => {
  assert.deepEqual(plans.map(p => p.price), [7.99, 16.99, 24.99]);
  assert.equal(monthlyCents(1, 0, 1), 3098);
});
test("organization example and shared-room quantities use exact cents", () => {
  assert.equal(monthlyCents(5, 0, 1), 5494);
  assert.equal(monthlyCents(10, 0, 1), 8489);
  assert.equal(monthlyCents(20, 1, 1), 16178);
});
test("ten users fit one room; an eleventh requires another room", () => {
  assert.equal(isOrganizationPackageValid(10, 0, 1), true);
  assert.equal(isOrganizationPackageValid(11, 0, 1), false);
  assert.equal(isOrganizationPackageValid(11, 1, 1), true);
  assert.equal(isOrganizationPackageValid(20, 1, 1), true);
  assert.equal(isOrganizationPackageValid(21, 1, 1), false);
});
test("discounted package requires a user and room, with bounded whole quantities", () => {
  for (const args of [[1, 0, 0], [0, 0, 1], ["", 0, 1], [1.5, 0, 1], [1, -1, 1], [1, "", 1], [1001, 100, 1]]) {
    assert.equal(isOrganizationPackageValid(...args), false);
  }
});
test("Basic includes audio recording and excludes every subsequent feature", () => {
  assert.equal(features.length, 35);
  assert.equal(features.find(row => row[0] === "Audio recording")[1], true);
  assert.ok(features.slice(features.findIndex(row => row[0] === "Audio recording") + 1).every(row => row[1] === false));
  assert.equal(features.find(row => row[0] === "Live streaming to YouTube")[2], true);
  assert.equal(features.find(row => row[0] === "Share second camera")[1], false);
  assert.equal(features.find(row => row[0] === "Unique participant codes")[1], false);
});


test("database catalog changes drive prices, feature rows and room validation", async () => {
  const pricing = await import('../src/pricing.js');
  const original = { currency: 'USD', plans: pricing.plans, features: pricing.features, organizationUserCents: pricing.organizationUserCents, usersPerSharedRoom: pricing.usersPerSharedRoom };
  try {
    pricing.applyCatalog({ ...original, plans: original.plans.map(p => ({ ...p, price: p.id === 'pro' ? 29.99 : p.price })), organizationUserCents: 699, usersPerSharedRoom: 5, features: [['Meeting participants', 25, 100, 250]] });
    assert.equal(pricing.monthlyCents(5, 0, 1), 6494);
    assert.equal(pricing.isOrganizationPackageValid(6, 0, 1), false);
    assert.equal(pricing.features.length, 1);
  } finally { pricing.applyCatalog(original); }
});
